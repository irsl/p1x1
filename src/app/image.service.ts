import { Injectable } from '@angular/core';
import { Helper } from './helper';
import { DefaultCanvasSnapshotContentType } from './video.service';


declare var Caman: any;

export interface PictureSize {
    width: number;
    height: number;
}

export interface ThumbnailDescriptor {
    [key: string]: PictureSize;
} 
export interface ImageWithSize {
    Size: PictureSize;
    Image: ArrayBuffer;
    Key?: string;
}

export class ImageEffects {
    brightness: number = 0; // -100 to 100
    contrast: number = 0; // -100 to 100
    sepia : number = 0; // 0 to 100
    saturation: number = 0; // -100 to 100
    vibrance: number = 0; // -100 to 100
    hue: number = 0; // 0 to 100
    gamma: number = 0; // 0 to 10
    clip: number = 0; // 0 to 100
    stackBlur: number = 0; // 0 to 20
    exposure: number = 0; // -100 to 100
    noise: number = 0; // 0 to 100
    sharpen: number = 0; // 0 to 100
}

@Injectable({
  providedIn: 'root'
})
export class ImageService {
    public LoadImageFromUrl(imageUrl: string, callback: (any) => void = null): Promise<ArrayBuffer>
    {        
        return this.LoadImageForCaman(imageUrl, callback)
    }
    public LoadImageFromBuffer(image: ArrayBuffer, contentType: string, callback: (any) => void = null, containerId?: string): Promise<ArrayBuffer>
    {        
        return Helper.createObjectURL(image, contentType, (objectURL: string): Promise<ArrayBuffer> => {
            return this.LoadImageForCaman(objectURL, callback, containerId);
        });
    }

    public getArrayBuffer(camanCanvasDomId: string): Promise<ArrayBuffer>
    {
        var htmlCanvasElement = document.getElementById(camanCanvasDomId) as HTMLCanvasElement;
        return new Promise<ArrayBuffer>((resolve, reject)=>{
            htmlCanvasElement.toBlob((blob: Blob)=>{
                Helper.BlobToArrayBuffer(blob).then(ab=>{
                    return resolve(ab);
                }).catch(reject);
            }, DefaultCanvasSnapshotContentType)
        })
    }

    private LoadImageForCaman(url: string, callback: (any) => void = null, containerId?: string) : Promise<ArrayBuffer>
    {
        var id = Math.floor(Math.random() * 10000000); 
        var holderName = "canvas-holder-"+id;
        var canvasName = "canvas-id-"+id; //

        var imgStr = `<img id='${canvasName}' src="${url}">`;
        if(!containerId) {
            document.body.innerHTML += `<div id="${holderName}" style='display: none;'>${imgStr}</div>`;
        } else {
            var el = document.getElementById(containerId);
            el.innerHTML = imgStr;
        }

        return new Promise<ArrayBuffer>((resolve)=>{
            Caman("#"+canvasName, function () {
                var camanObject = this;

                if(callback) {
                    callback(camanObject);
                }

                camanObject.render(function () {
                    var canvas = document.getElementById(canvasName) as HTMLCanvasElement;
                    canvas.toBlob(async (blob) => {
                        if(!containerId)
                        {
                            var el = document.getElementById(holderName);
                            el.parentNode.removeChild(el);    
                        }else{
                            var el = document.getElementById(containerId);
                            el.innerHTML = "";
                        }
                        var ab = await new Response(blob).arrayBuffer();
                        resolve(ab as ArrayBuffer);
                    });

                });
            });
        })
    }

    public GetImageDimensions(image: ArrayBuffer, contentType: string, containerId?: string): Promise<PictureSize> {
        var curW;
        var curH;
        return this.LoadImageFromBuffer(image, contentType, (camen)=>{
            curW = camen.imageWidth();
            curH = camen.imageHeight();
        }, containerId)
        .then(()=>{
            if((!curW)||(!curH)) return null;

            return {
                width: curW,
                height: curH,
            };
        })
    }

    // might return null if the requested size is bigger
    public CreateThumbnail(image: ArrayBuffer, contentType: string, thumbnailSize: PictureSize, key?: string, containerId?: string): Promise<ImageWithSize>
    {        
        var resized = false;
        return this.LoadImageFromBuffer(image, contentType, (camen)=>{
            // cropping first
            var curW = camen.imageWidth();
            var curH = camen.imageHeight();
            // console.log("dimensions", curW, curH, thumbnailSize);
            if((curW < thumbnailSize.width)&&(curH < thumbnailSize.height))
            {
                return;
            }

            if(curW > curH)
            {                
                var offsetX = (curW - curH) / 2;
                camen.crop(curH, curH, offsetX, 0);
            }
            else if(curW < curH)
            {
                var offsetY = (curH - curW) / 2;
                camen.crop(curW, curW, 0, offsetY);
            }
            else {
            // no cropping needed
            }

            // and then resizing
            camen.resize(thumbnailSize)

            resized = true;
        }, containerId)
        .then(ab=>{
            if(!resized) return null;

            return {
                Size: thumbnailSize,
                Image: ab,
                Key: key,
            };
        })
    }

    public async CreateThumbnailsForDescriptor(image: ArrayBuffer, contentType: string, thumbnailSizes: ThumbnailDescriptor, containerId?: string): Promise<Array<ImageWithSize>>
    {        
        var re : Array<ImageWithSize> = [];
        for(let key of Object.keys(thumbnailSizes))
        {
            var ts = thumbnailSizes[key];
            var ab = await this.CreateThumbnail(image, contentType, ts, key, containerId);
            if(ab != null)
              re.push(ab);
        }
        return re;
    }

    public CreateThumbnails(image: ArrayBuffer, contentType: string, thumbnailSizes: PictureSize[], containerId?: string): Promise<Array<ImageWithSize>>
    {        
        var desc = {};
        var i = 0;
        for(let q of thumbnailSizes){
            desc[i++] = q;
        }        
        return this.CreateThumbnailsForDescriptor(image, contentType, desc, containerId);
    }

    // this might return null if the source image is smaller then the requested size
    public ResizeImage(image: ArrayBuffer, contentType: string, newSizeBiggerDimension: number): Promise<ImageWithSize>
    {
        var resized = false;
        var newDimension : PictureSize;
        return this.LoadImageFromBuffer(image, contentType, (camen)=>{
            // cropping first
            var curW = camen.imageWidth();
            var curH = camen.imageHeight();

            // now we need to decide if resizing is needed at all or not.
            if(curW > curH)
            {
                // is the picture wide enough?
                if(curW < newSizeBiggerDimension)
                   return;

                newDimension = {
                    width: newSizeBiggerDimension,
                    height: Math.floor(curH*newSizeBiggerDimension/curW),
                }
            }
            else
            {
                // is the picture tall enough?
                if(curH < newSizeBiggerDimension)
                   return;

                newDimension = {
                    width: Math.floor(curW*newSizeBiggerDimension/curH),
                    height: newSizeBiggerDimension,
                }
            }


            // and then resizing
            camen.resize(newDimension);

            resized = true;
        })
        .then((ab)=>{
            if(!resized)
               return null;

            return {
                Size: newDimension,
                Image: ab,
            }
        })

    }

    public ResizeImageToNewSizes(image: ArrayBuffer, contentType: string, newSizes: Array<number>): Promise<Array<ImageWithSize>>
    {
        var re : Array<ImageWithSize> = [];
        return new Promise(async (resolve)=>{
            for(let s of newSizes)
            {
                var ab = await this.ResizeImage(image, contentType, s);
                if(ab != null) 
                {                    
                    re.push(ab);
                }
            }

            return resolve(re);
        })
    }
    public applyPreset(imageDomId: string, presetName: string, phaseCallback: (event: string)=>void) {
        phaseCallback("Loading image...")
        var c = Caman("#"+imageDomId, function () {
    
            if(presetName) {
                phaseCallback("Applying preset: "+presetName)
                this[presetName]();
            }

            phaseCallback("Rendering image against preset: "+presetName)
            this.render();

            if(!presetName)
               phaseCallback("processComplete");
         });   
         for(let q of ["processStart","processComplete","renderFinished","blockStarted","blockFinished"]){
            Caman.Event.listen(c, q, function(){
                phaseCallback(q);
            });
         }

         return c; 
    }

    public applyEffects(imageDomId: string, effects: ImageEffects, phaseCallback: (event: string)=>void) {
        phaseCallback("Loading image...")
        var c = Caman("#"+imageDomId, function () {
            var applied = 0;
            for(var q of Object.keys(effects))
            {
                var v = effects[q];
                if(!v) continue;

                this[q](v);

                applied++;
            }

            this.render();

            if(!applied)
               phaseCallback("processComplete")
         });   
         for(let q of ["processStart","processComplete","renderFinished","blockStarted","blockFinished"]){
            Caman.Event.listen(c, q, function(){
                phaseCallback(q);
            });
         }

         return c; 
    }
}
