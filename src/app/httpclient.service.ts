import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Helper } from "./helper";

@Injectable({
    providedIn: 'root'
  })
  export class HttpClientService {
      constructor(private httpClient: HttpClient)
      {        
      }

      public downloadUrlAsType<T>(TCreator: {new(): T}, url: string): Promise<T>
      {
          return this.downloadUrlAsArrayBuffer(url)
            .then((b: ArrayBuffer) => {
                return Helper.jsonArrayBufferToType(TCreator, b);
            })
      }        

      public downloadUrlAsArrayBuffer(url: string): Promise<ArrayBuffer>
      {
          return this.downloadUrlAsBlob(url)
            .then((b: Blob) => {
                return Helper.BlobToArrayBuffer(b)
            })
      }        

      public downloadUrlAsBlob(url: string): Promise<Blob>
      {        
          return new Promise<Blob>((resolve,reject)=>{
              // https://stackoverflow.com/questions/51682514/angular-how-to-download-a-file-from-httpclient
              return this.httpClient.get(url, {responseType: 'blob' as 'json'})
                .subscribe((response:any)=>{
                  let dataType = response.type;
                  let binaryData = [];
                  binaryData.push(response);
                  var blob = new Blob(binaryData, {type: dataType})
                  resolve(blob);
              }, err=>{
                  reject(err);
              })

          });
      }
  
  }
  