import { Injectable } from '@angular/core';
import * as mobilenet from '@tensorflow-models/mobilenet';
import { Helper } from './helper';
import { StringKeyValuePairs } from './catalog.common';

export interface TensorflowClassification {
    className: string;
    probability: number;
}

@Injectable({
  providedIn: 'root'
})
export class ImageClassifierService {

    private modelLoaded: boolean = false;
    private model: mobilenet.MobileNet;

    private async loadModel(){
        if(this.modelLoaded) return;
        this.model = await mobilenet.load();
        this.modelLoaded = true;
    }

    public async classifyToTags(image: ArrayBuffer, contentType: string, minProbability: number, containerDomId?: string): Promise<StringKeyValuePairs>
    {
        var classes = await this.classify(image, contentType, containerDomId);
        var re:StringKeyValuePairs = {};
        for(let q of classes) 
        {
            if(q.probability >= minProbability)
            {
                re["class."+q.className]="";
            }
        }

        return re;
    }

    public async classify(image: ArrayBuffer, contentType: string, containerDomId?: string): Promise<TensorflowClassification[]>
    {
        await this.loadModel();

        var cleanup = false;

        var id = Math.floor(Math.random() * 10000000); 
        var imageId = "tensor-image-"+id;
        if(!containerDomId)
        {
            containerDomId = "tensor-container-"+id;
            cleanup = true;
    
            document.body.innerHTML = document.body.innerHTML + "<div style='display:none' id='"+containerDomId+"' ></div>"; // 
        }

        var container: HTMLElement = document.getElementById(containerDomId);

        try{
            var imageUrl = await Helper.arrayBufferToDataUrl(image, contentType);

            var img = await this.addImage(container, imageUrl);
            // console.log("img", img, img.width, img.clientWidth, img.height, img.clientHeight)

            return await this.model.classify(img);
        }finally {
            if(cleanup)
            {
                container.parentElement.removeChild(container);
            }
            else
            {
                container.innerHTML = "";
            }
        }
    }

    private addImage(container: HTMLElement, imageUrl: string): Promise<HTMLImageElement>
    {
        return new Promise<HTMLImageElement>((resolve,reject)=>{
            if(!container) reject(new Error("Container not found"));

            var id = Math.floor(Math.random() * 10000000); 
            var imageId = "tensor-image-"+id;
    
            container.innerHTML = "<img id='"+imageId+"'>";

            var img = document.getElementById(imageId) as HTMLImageElement;
            img.src = imageUrl;
            img.onerror = function(e){
                // console.error("XXX?!?", e)
                reject(e);
            }
            img.onload = function(){
                // console.log("img", img, img.width, img.clientWidth, img.height, img.clientHeight)
                resolve(img);
            }            

        })
    }
}
