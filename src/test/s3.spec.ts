import { TestBed } from '@angular/core/testing';

import { S3Service, S3Connection } from '../app/s3';
import { PngImageDataUrl } from './image.service.spec';
import { Helper } from 'src/app/helper';
import { HttpClientService } from 'src/app/httpclient.service';
import { HttpClientModule } from '@angular/common/http';

export function GetS3ConnectionForTesting(bucket: string, subdir?: string): S3Connection {
    return Helper.createRaw(S3Connection,{
        https: false,
        hostname: "127.0.0.1",
        port: 9000,
        bucket: bucket,
        subdir: subdir,
        credentials: {
            accessKeyId: "minio",
            secretAccessKey: "miniostorage",
        },
        useSubdomains: false
    })
}

describe('S3Service', () => {

    let connection: S3Connection = GetS3ConnectionForTesting("integration-test");
    let httpClientService: HttpClientService;
    
    beforeEach(() => {
      TestBed.configureTestingModule({
        imports: [HttpClientModule],
        providers: [
            HttpClientService
          ],

      });
      httpClientService = TestBed.get(HttpClientService);
    });
  
    it('s3 sdk constructor tests', () => {
        var c = connection.getS3Constructor()
        var creds = c.credentials;
        expect(creds.accessKeyId).toBe(connection.credentials.accessKeyId);
        expect(creds.secretAccessKey).toBe(connection.credentials.secretAccessKey);
        delete c.credentials;
        // console.log(c);
        expect(c).toEqual({
           signatureVersion: 'v4',
           endpoint: 'http://127.0.0.1:9000/integration-test', 
           s3BucketEndpoint: true
        });

        var s3conn = Helper.createRaw(S3Connection,{
            https: true,
            hostname: "s3.eu-west-1.amazonaws.com",
            bucket: "whatever",
            credentials: {
                accessKeyId: "access",
                secretAccessKey: "secret",
            },
            useSubdomains: true
        });
        c = s3conn.getS3Constructor();
        delete c.credentials;
        // console.log(c);
        expect(c).toEqual({
            signatureVersion: 'v4',
            endpoint: 'https://s3.eu-west-1.amazonaws.com', 
           s3BucketEndpoint: false
        });

        var csub = S3Connection.AsSubdir(s3conn, "foobar2");
        expect(csub.subdir).toBe("foobar2");

        c = Helper.createRaw(S3Connection,{
            https: true,
            hostname: "s3.eu-west-1.amazonaws.com",
            bucket: "whatever",
            credentials: {
                accessKeyId: "access",
                secretAccessKey: "secret",
            },
            subdir: "foobar",
            useSubdomains: false
        }).getS3Constructor();
        delete c.credentials;
        // console.log(c);
        expect(c).toEqual({
            signatureVersion: 'v4',
            endpoint: 'https://s3.eu-west-1.amazonaws.com/whatever', 
           s3BucketEndpoint: true
        });

        // if bucket contains any slashes, it shall be removed
        s3conn = Helper.createRaw(S3Connection, {
            https: true,
            hostname: "s3.eu-west-1.amazonaws.com",
            bucket: "/whatever/",
            credentials: {
                accessKeyId: "access",
                secretAccessKey: "secret",
            },
            subdir: "foobar",
            useSubdomains: false
        });
        c = s3conn.getS3Constructor();
        delete c.credentials;
        // console.log(c);
        expect(c).toEqual({
            signatureVersion: 'v4',
            endpoint: 'https://s3.eu-west-1.amazonaws.com/whatever', 
           s3BucketEndpoint: true
        });

        csub = S3Connection.AsSubdir(s3conn, "foobar2");
        expect(csub.subdir).toBe("foobar/foobar2");
    });

    it('uploading/downloading/deleting/listing', async () => {
        var filename = "whatever.txt";
        var s3 = new S3Service(connection);
        var ab = Helper.dataUrlToArrayBuffer(PngImageDataUrl);
        await s3.Upload(filename, ab, "image/png");
        // uploaded! hurray

        var s = await s3.Download(filename);
        var expectedStr = await Helper.arrayBufferToDataUrl(ab);
        var actualStr = await Helper.arrayBufferToDataUrl(s.Data);
        expect(actualStr).toBe(expectedStr);

        var list = await s3.List();
        expect(list.Response.Contents.length).toBe(1);
        expect(list.Response.Contents[0].Key).toBe(filename);
        expect(list.Response.Contents[0].Size).toBe(137);

        //delReq
        await s3.Delete([{Key: list.Response.Contents[0].Key}]);

        var list = await s3.List();
        expect(list.Response.Contents.length).toBe(0);

    });
    
    it('listing bucket with many files', async () => {
        var c = GetS3ConnectionForTesting("manyfiles");
        var s3 = new S3Service(c);

        var list = await s3.List();
        expect(list.Response.Contents.length).toBe(1001);
        expect(Object.keys(list.KeyToObjectMap).length).toBe(1001);
    });
    
    it('listing bucket with subdirs', async () => {
        var bucket = "withsubdirs";
        var c1 = GetS3ConnectionForTesting(bucket);
        var s3 = new S3Service(c1);

        var list = await s3.List();
        expect(list.Response.Contents.length).toBe(1);
        expect(list.Response.CommonPrefixes.length).toBe(1);
        expect(list.Response.CommonPrefixes[0].Prefix).toBe("subdir/");
        expect(list.Subdirs).toEqual(["subdir"]);

        expect(Object.keys(list.KeyToObjectMap).length).toBe(1);
        expect(list.KeyToObjectMap["1.txt"].Key).toBe("1.txt");

        var c2 = GetS3ConnectionForTesting(bucket, "subdir");
        s3 = new S3Service(c2);
        list = await s3.List();
        expect(list.Response.Contents.length).toBe(2);
        expect(list.Response.CommonPrefixes.length).toBe(1);
        expect(list.Subdirs[0]).toBe("subdiragain", "subdir prefix shall not be present in the subdir list");

        var filename = "whatever.txt";
        var ab = Helper.dataUrlToArrayBuffer(PngImageDataUrl);
        await s3.Upload(filename, ab, "image/png");
        list = await s3.List();
        expect(list.Response.Contents.length).toBe(3);
        expect(Object.keys(list.KeyToObjectMap)[0]).toBe("2.txt", "The subdir prefix shall not be present in the KeyToObjectMap!");
        expect(list.Response.Contents[0].Key).toBe("2.txt", "Not even in the S3 output");

        // ok, now deleting the file we just uploaded
        await s3.Delete([{Key: filename}]);
        list = await s3.List();
        expect(list.Response.Contents.length).toBe(2);

        delete connection.subdir;
    });

    it("presigned url creation for download operations", async ()=>{
        var filename = "hello.txt";
        var s3conn = GetS3ConnectionForTesting("preshared");
        var s3 = new S3Service(s3conn);

        var presignedUrl = await s3.GeneratePresignedUrlForDownload(filename, 60);
        expect(presignedUrl.startsWith("http://127.0.0.1:9000/preshared/hello.txt?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=minio")).toBeTruthy();
        var blob = await httpClientService.downloadUrlAsBlob(presignedUrl);
        expect(blob.type).toBe("text/plain");
        var actualAb = await Helper.BlobToArrayBuffer(blob);
        var actualStr = Helper.ArrayBufferToUtf8String(actualAb);
        expect(actualStr).toBe("hello preshared world");

     
    })

});

