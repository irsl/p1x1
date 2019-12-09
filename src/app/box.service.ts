import { Helper } from './helper';
import { Injectable } from '@angular/core';
import { Lightbox, LightboxEvent, LIGHTBOX_EVENT, IAlbum } from 'ngx-lightbox';
import { DomSanitizer } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { EventSeverity } from './catalog.common';
import { ModalService } from './modal.service';

interface LightBoxImage<T> extends IAlbum {
    blobUrl: string;
    mediaItem: T;
    boxItem: BoxItem<T>;
}
interface BoxItem<T> {
    caption: string;
    contentType: string;
    mediaItem: T;
}

export interface BoxOperations<T> {
    display(mediaItem: T): Promise<void>,
    clear(),
    addItem(item: T, caption: string, contentType: string),
    close(),
}

@Injectable({
    providedIn: 'root'
})
export class BoxService {

    constructor(
        private _lightbox: Lightbox,
        private _lightboxEvent: LightboxEvent,    
        private sanitizer:DomSanitizer,
        private modal: ModalService,
    )
    {
    }

    public Build<T>(
        contentResolver: (item: T)=>Promise<ArrayBuffer>,
    ): BoxOperations<T>
    {
        var me = this;
        var _subscription: Subscription;
        var lightBoxImages: LightBoxImage<T>[] = [];
        var boxItems: BoxItem<T>[] = [];

        _subscription = me._lightboxEvent.lightboxEvent$.subscribe(event => lightbox_onReceivedEvent(event));    

        var re: BoxOperations<T> = {

            async display(mediaItem: T)
            {
                var boxItem = findBoxItem(mediaItem);
                if(!boxItem) return;

                var contentType = boxItem.contentType;

                if(Helper.isVideo(contentType))
                {
                   return displayVideo(boxItem);
                }
          
                if(Helper.isImage(contentType))
                {
                   return displayImage(boxItem);
                }          
            },

            clear(){
                revokeAllLightBoxImages();
                lightBoxImages = [];
                boxItems = [];
            },

            addItem(item: T, caption: string, contentType: string)
            {
                var boxItem = {caption: caption, contentType: contentType, mediaItem: item};
                boxItems.push(boxItem);

                if(!Helper.isImage(contentType))
                   return;
                var lbi : LightBoxImage<T> = {
                  boxItem: boxItem,
                  mediaItem: item,
                  caption: caption,
                  thumb: null,
                  blobUrl: null,
                  src: "#"+lightBoxImages.length,
                };
                lightBoxImages.push(lbi);
            },
        
            close() {
                _subscription.unsubscribe();    
            },

        }

        return re;

        function findBoxItem(mediaItem: T): BoxItem<T>{
            for(let q of boxItems){
                if(q.mediaItem == mediaItem)
                   return q;
            }
            return null;
        }

        async function displayVideo(boxItem: BoxItem<T>){
            var eventCallbackManager = me.modal.openEventCallbackForm("Opening video", true);
            eventCallbackManager.callback(EventSeverity.Info, "Downloading video: "+boxItem.caption);
            var ab = await contentResolver(boxItem.mediaItem);
            eventCallbackManager.dismissUnlessWarnings();
       
            var contentType = boxItem.contentType;
            try{
              Helper.createObjectURL(ab, contentType, async function(blobUrl: string): Promise<void> {
                var safeBlobUrl = me.sanitizer.bypassSecurityTrustUrl(blobUrl) as any;
                await me.modal.showVideo(boxItem.caption, contentType, safeBlobUrl);
              })
            }catch(e){
               me.modal.showErrorPrompt("Error while playing this video: "+e.toString());
            }
        }
        async function displayImage(boxItem: BoxItem<T>){
            var index = await doLightBoxPreloadByFile(boxItem.mediaItem);
            if(index > -1)
               me._lightbox.open(lightBoxImages, index);
        }

        function findLightBoxIndexByFile(mediaItem: T) : number
        {
          var i = 0;
          for(let q of lightBoxImages)
          {
            if(q.mediaItem == mediaItem)
            {
               return i;
            }
            i++;
          }
          return -1;
        }

        async function doLightBoxPreloadByFile(mediaItem: T) : Promise<number>
        {
          var i = findLightBoxIndexByFile(mediaItem);
          if(i < 0) return i;
          await doLightBoxPreloadAroundIndex(i);
          return i;
        }

        async function doLightBoxPreloadForASingleIndex(index: number)
        {
          var li = lightBoxImages[index];
          if(li.blobUrl != null) return;
      
          var mediaItem = li.mediaItem;
          var ab = await contentResolver(mediaItem);
          const blob = new Blob([ab], {type: li.boxItem.contentType});
          li.blobUrl = URL.createObjectURL(blob);
          li.src = me.sanitizer.bypassSecurityTrustUrl(li.blobUrl) as any;
        }

        async function doLightBoxPreloadAroundIndex(index: number)
        {
           await doLightBoxPreloadForASingleIndex(index);
           if(index - 1 > -1)
              await doLightBoxPreloadForASingleIndex(index-1);
           if(index + 1 < lightBoxImages.length)
              await doLightBoxPreloadForASingleIndex(index+1);
      
           // and some revocations:
           revokeLightBoxForIndex(index-2);
           revokeLightBoxForIndex(index+2);
        }

        function revokeLightBoxForIndex(index: number)
        {
           if(index < 0) return;
           if(index >= lightBoxImages.length) return;
           var li = lightBoxImages[index];
           if(!li.blobUrl) return;
           URL.revokeObjectURL(li.blobUrl);
           li.blobUrl = null;
           li.src = "#"+index;
        }
        
        function revokeAllLightBoxImages(){
          for(var i= 0; i < lightBoxImages.length; i++)
          {
              revokeLightBoxForIndex(i);
          }
        }
      
        function onCloseLightBox(){
          revokeAllLightBoxImages()
        }

        function lightbox_onReceivedEvent(event: any): void {
            console.log("LIGHTBOX EVENT!", event)
        
            // remember to unsubscribe the event when lightbox is closed
            if (event.id === LIGHTBOX_EVENT.CLOSE) {
              // event CLOSED is fired
              onCloseLightBox();
            }
         
            if (event.id === LIGHTBOX_EVENT.OPEN) {
              // event OPEN is fired
            }
         
            if (event.id === LIGHTBOX_EVENT.CHANGE_PAGE) {
              // event change page is fired
               doLightBoxPreloadAroundIndex(event.data);
            }
        }
    
    }
    
    
}
