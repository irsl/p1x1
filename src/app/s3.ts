import { S3 } from 'aws-sdk';


import { Helper } from './helper';
import * as AWS from 'aws-sdk';
import { Validate } from './formbuilder.common';
import { Validators } from '@angular/forms';

export interface DownloadResult {
   Data: ArrayBuffer;
   Response: S3.GetObjectOutput;
}
export interface StringToObjectPairs {
  [key: string]: S3.Object;
} 

export class ListResult {
   KeyToObjectMap: StringToObjectPairs;
   Subdirs: string[];
   Response: S3.ListObjectsV2Output;
}
export class S3ConnectionCredentials 
{
  @Validate([Validators.required])
  accessKeyId: string;

  @Validate([Validators.required])
  secretAccessKey: string;
}
export class S3Connection {
   @Validate([Validators.required], {castToBoolean: true})
   https: boolean = true;

   @Validate([Validators.required])
   hostname: string;

   @Validate([])
   port?: number;

   @Validate([])
   subdir?: string;

   @Validate([Validators.required])
   bucket: string;

   @Validate([], {group: S3ConnectionCredentials})
   credentials: S3ConnectionCredentials;

   @Validate([Validators.required], {castToBoolean: true})
   useSubdomains: boolean;
    
   public static AsSubdir(parent: S3Connection, subdir: string): S3Connection
   {
      var re = Helper.create(S3Connection, parent);
      re.subdir = re.subdir ? re.subdir + "/" + subdir : subdir;
      return re;
   }

   public getS3Constructor() : S3.ClientConfiguration
   {
      var re = {
         signatureVersion: 'v4', // note: the default signature scheme is not compatible with minio
         endpoint: this.getEndpoint(),
         s3BucketEndpoint: this.useSubdomains ? false : true,
         credentials: new AWS.Credentials(this.credentials.accessKeyId, this.credentials.secretAccessKey),
      }
      return re;
   }
   public getEndpoint(): string
   {
      return (this.https ? "https" : "http")+"://"+
              this.hostname+(this.port ? ":"+this.port : "")+
             (!this.useSubdomains?"/"+Helper.trimSlashes(this.bucket):"");
   }
   public getSubdir(): string
   {
     return this.subdir || "/";
   }
   public getUniqueId(): string
   {
     return this.getEndpoint()+"/"+(this.subdir || "");
   }
   public getShortId(): string {
    return (this.subdir ? this.subdir : this.getEndpoint())
   }
}

export interface IS3 {
   GetConnection(): S3Connection;
   Upload(filename: string, body: ArrayBuffer, contentType?: string): Promise<void>;
   Download(filename: string): Promise<DownloadResult>;
   DownloadJson(filename: string): Promise<any>;
   List(): Promise<ListResult>;
   Delete(deleteObjects: S3.ObjectIdentifierList): Promise<void>;
   GeneratePresignedUrlForDownload(filename: string, expirationSeconds: number): Promise<string>;
}

export class S3Service implements IS3 {
   private s3: S3;

   constructor(private connection: S3Connection)
   {
       connection.subdir = Helper.trimSlashes(connection.subdir);
 
       this.s3 = new S3(connection.getS3Constructor());
   }

   public async DownloadJson(filename: string): Promise<any>
   {
      var d = await this.Download(filename);
      var indexJsonStr = Helper.ArrayBufferToUtf8String(d.Data);
      return JSON.parse(indexJsonStr);
   }

   public async DownloadType<T>(filename: string, TCreator: { new(): T; }): Promise<T>
   {
      var d = await this.DownloadJson(filename);
      return Helper.create(TCreator, d);
   }

   public GeneratePresignedUrlForDownload(filename: string, expirationSeconds: number): Promise<string> {
       var params = {Bucket: this.connection.bucket, Key: filename, Expires: expirationSeconds};//
       return this.s3.getSignedUrlPromise('getObject', params);
   }

   public GetConnection() {
       return this.connection;
   }

   public Upload(filename: string, body: ArrayBuffer, contentType?: string): Promise<void>
   {
      var blob = Helper.ArrayBufferToBlob(body, contentType);
      var params : S3.PutObjectRequest = {Bucket: this.connection.bucket, Key: this.getFullName(filename), Body: blob, ContentType: contentType};
      return Helper.callbackToPromise<any>((cb)=>{
        this.s3.upload(params, cb);
      })
   }

   public async Download(filename: string): Promise<DownloadResult>
   {
      var resp = await Helper.callbackToPromise<S3.GetObjectOutput>((cb)=>{
        this.s3.getObject({Bucket: this.connection.bucket, Key: this.getFullName(filename)}, cb);
      });

      var re : DownloadResult = {
        Data: (resp.Body as Uint8Array).buffer as ArrayBuffer,
        Response: resp,
      };

      return re;
   }

   public async List(): Promise<ListResult>
   {
       var resp : S3.ListObjectsV2Output = null;
       var a : S3.ListObjectsV2Output = null;

       var query : S3.ListObjectsV2Request = {Bucket: this.connection.bucket, Delimiter: "/"};
       if(this.connection.subdir)
         query.Prefix = this.connection.subdir+"/";

       while(true)
       {
           a = await Helper.callbackToPromise<S3.ListObjectsV2Output>((cb)=>{
              this.s3.listObjectsV2(query, cb);
           });
           if(this.connection.subdir) {
              for(let q of a.Contents) {
                 q.Key = q.Key.substr(this.connection.subdir.length+1);
              }
           }

           if(!resp) {
             resp = a;
           }
           else {
             // we need to merge the response
             resp.Contents = resp.Contents.concat(a.Contents);
           }

           if(!a.IsTruncated)
           {
              // we are ready!
              break;
           }

           query.StartAfter = a.Contents[a.Contents.length-1].Key;
       }

       var map : StringToObjectPairs = {};
       for(let q of resp.Contents){
         map[q.Key] = q;
       }

       var subdirs = resp.CommonPrefixes.map(x => x.Prefix.substring(0, x.Prefix.length -1));
       if(this.connection.subdir) {
            for(var i = 0; i < subdirs.length; i++) {
              subdirs[i] = subdirs[i].substr(this.connection.subdir.length+1);
            }
        }

       var re : ListResult = {
         KeyToObjectMap: map,
         Response: resp,
         Subdirs: subdirs,
       };

       return re;
    }

    public async DeleteEverythingBut(but: string[]): Promise<void>
    {
      var listResult = await this.List();
      var toBeDeleted : S3.ObjectIdentifier[] = [];
      for(let q of Object.keys(listResult.KeyToObjectMap)) {
          if(but.indexOf(q) < 0)
             toBeDeleted.push({Key: q})
      }
      if(toBeDeleted.length > 0)
         await this.Delete(toBeDeleted);
    }

    public Delete(deleteObjects: S3.ObjectIdentifierList): Promise<void>
    {
        let aDelObjects : S3.ObjectIdentifierList = deleteObjects;
        if(this.connection.subdir) {
          aDelObjects = [];
          for(let d of deleteObjects){
              aDelObjects.push({
                Key: this.connection.subdir+"/"+d.Key,
                VersionId: d.VersionId
              })
          }
        }
        var params : S3.DeleteObjectsRequest = {
            Bucket: this.connection.bucket,
            Delete: {
              Objects: aDelObjects,
            },
        };
        return Helper.callbackToPromise<any>((cb)=>{
            this.s3.deleteObjects(params, cb);
        });            
    }

    private getFullName(filename: string): string
    {
        if(this.connection.subdir)
          return this.connection.subdir+"/"+filename;
        return filename;
    }
}
