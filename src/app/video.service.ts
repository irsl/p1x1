import { Injectable } from '@angular/core';
import { PictureSize } from './image.service';
import { Helper } from './helper';
import PixiError, {E} from './error';

interface VideoCallback { (vid: HTMLVideoElement): void }
interface VideoEventCallback { (vid: HTMLVideoElement, event: string, params: any): any }

export interface VideoSizeAndDuration extends PictureSize {
    duration: number;
}

// according to the documentation previews are encoded into png file format by default
// we specify this explicitly anyway
export const DefaultCanvasSnapshotContentType = "image/png";

@Injectable({
  providedIn: 'root'
})
export class VideoService {
    private getVideoElement(videoUrl: string, callback: VideoCallback, videoContainerDomId?: string): ()=>void {
        var id = Math.floor(Math.random() * 10000000); 
        var videoId = "video-id-"+id; //

        var cleanup = false;
        if(!videoContainerDomId)
        {
            videoContainerDomId = "video-container-"+id;
            cleanup = true;
            document.body.innerHTML = document.body.innerHTML+"<div id='"+videoContainerDomId+"' style='display:none'></div>";
        }

        var container = document.getElementById(videoContainerDomId);
        if(!container) {
            callback(null);
            return null;
        }

        container.innerHTML = "<video crossorigin='anonymous' id='"+videoId+"'></video>";
        var video = document.getElementById(videoId) as HTMLVideoElement;

        var closer = function(){
            if(cleanup){
                var el = document.getElementById(videoContainerDomId);
                el.parentNode.removeChild(el);    

            }
            else {
                container.innerHTML = "";
                video = null;
            }
        }

        callback(video);

        video.src = videoUrl;

        return closer;
    }
    private getVideoElementAsPromise(videoUrl: string, events: string[], dispatcher: VideoEventCallback, videoContainerDomId?: string): Promise<any>{

        return new Promise<void>((resolve,reject)=>{
            var closer = this.getVideoElement(videoUrl, async function(video: HTMLVideoElement){
                if(!video) {
                    reject(new PixiError(E.ErrorWhileLoadingVideo, null, "Internal error, cannot find video container"))
                    return;
                }

                video.addEventListener( "error", function (e) {
                    console.log("error while working on video:", videoUrl, e)
                    closer();
                    reject(new PixiError(E.ErrorWhileLoadingVideo, e.error, videoUrl))
                });

                for(let event of events){
                    video.addEventListener(event, async function(params){
                        try{
                            var ready = await dispatcher(video, event, params);
                            // console.log("evenr returned", event, ready)
                            if(!ready) return;
            
                            closer();
                            resolve(ready);    
                        }catch(e){
                            reject(e);
                        }        
                    })
                }
        
            }, videoContainerDomId)
        });
    }

    public getVideoResolutionByUrl(videoUrl: string, videoContainerDomId?: string): Promise<VideoSizeAndDuration>{
        return this.getVideoElementAsPromise(videoUrl, ["loadedmetadata"], function(vid: HTMLVideoElement, event: string, params: any){
            var re: VideoSizeAndDuration = {
                width: vid.videoWidth,
                height: vid.videoHeight,
                duration: vid.duration,
            }
            return re;

        }, videoContainerDomId)

    }
    public async getVideoResolutionByArrayBuffer(arrayBuffer: ArrayBuffer, contentType: string, videoContainerDomId?: string): Promise<VideoSizeAndDuration>
    {
        return Helper.createObjectURL(arrayBuffer, contentType, (videoUrl: string): Promise<VideoSizeAndDuration> => {
            return this.getVideoResolutionByUrl(videoUrl, videoContainerDomId);
        })
        
    }

    public getVideoThumbnailByUrl(videoUrl: string, videoContainerDomId?: string): Promise<ArrayBuffer>{
        return this.getVideoElementAsPromise(videoUrl, ["loadedmetadata", "timeupdate"], function(vid: HTMLVideoElement, event: string, params: any){
            if(event == "loadedmetadata") {
                vid.currentTime = vid.duration / 2;
                return;
            }
            if(event == "timeupdate") {
                var id = Math.floor(Math.random() * 10000000); 
                var videoCanvasId = "video-canvas-element-"+id;                
                vid.parentElement.innerHTML = vid.parentElement.innerHTML + "<canvas id='"+videoCanvasId+"'></canvas>"
                var _CANVAS = document.querySelector("#"+videoCanvasId) as HTMLCanvasElement;
                _CANVAS.width = vid.videoWidth;
                _CANVAS.height = vid.videoHeight;

                var _CANVAS_CTX = _CANVAS.getContext("2d");
                _CANVAS_CTX.drawImage(vid, 0, 0, vid.videoWidth, vid.videoHeight);

                var dataStr = _CANVAS.toDataURL(DefaultCanvasSnapshotContentType);
                // console.log("snapshot created, dataurl is", dataStr);
                return Helper.dataUrlToArrayBuffer(dataStr);
            }

        }, videoContainerDomId)

    }
    public async getVideoThumbnailByArrayBuffer(arrayBuffer: ArrayBuffer, contentType: string, videoContainerDomId?: string): Promise<ArrayBuffer>
    {
        return Helper.createObjectURL(arrayBuffer, contentType, (videoUrl: string): Promise<ArrayBuffer> => {
            return this.getVideoThumbnailByUrl(videoUrl, videoContainerDomId);
        })
        
    }
}
