import { Injectable } from '@angular/core';
import { Helper } from './helper';
import PixiError, {E} from './error';
import { ModalService, IEventCallbackManager } from './modal.service';
import { ImageMetaInfoService } from './image.metainfo.service';
import { EventSeverity, StringKeyValuePairs, TagKeyValuePairs } from './catalog.common';
import { UploadFileDetails, ICatalog } from './catalog.service';
import { Router } from '@angular/router';
import { ImageService, ThumbnailDescriptor } from './image.service';
import { VideoService, DefaultCanvasSnapshotContentType } from './video.service';
import { ImageClassifierService } from './image.classifier.service';

export interface FileToUpload {
    file: File,
    arrayBuffer?: ArrayBuffer,
    fileName: string,
    fileType: string,
    sizeHuman: string,
    tagsCount: number,
    tags: StringKeyValuePairs,
    dimensionTags: TagKeyValuePairs,

    processed: boolean,
}

export const tensorFlowContainerDomId = "tensorflow-container-id";

export const videoContainerId = "video-container";
export const camanCanvasId = "caman-canvas";
export const ThumbnailKeySmall = "thumbnail-small";
export const ThumbnailKeyMedium = "thumbnail-medium";
const thumbnailSizes : ThumbnailDescriptor = {};
thumbnailSizes[ThumbnailKeySmall] = {width: 150, height: 150};
thumbnailSizes[ThumbnailKeyMedium] = {width: 300, height: 300};

@Injectable({
  providedIn: 'root'
})
export class UploadService {
    constructor(
        private router: Router,
        private modalService: ModalService, 
        private metaService: ImageMetaInfoService,
        private imageService: ImageService, 
        private videoService: VideoService, 
        private classifierService: ImageClassifierService, 
      ) 
      {
      }
      private getFilesToBeProcessed(filesToUpload: FileToUpload[]): FileToUpload[] {
        return filesToUpload.filter(x => !x.processed);
      }

      private async getArrayBuffer(q: FileToUpload): Promise<ArrayBuffer>
      {
          if(q.arrayBuffer) return q.arrayBuffer;

          return await Helper.fileToArrayBuffer(q.file);
      }
       
      public async processFilesToUpload(filesToUpload: FileToUpload[], extractExifTags: boolean, executeTensorFlow: boolean, minProbability: number = 0) {      
        var modal = this.modalService;
        var meta = this.metaService;
        var processed = 0;
        while(true)
        {
            var toBeProcessed = this.getFilesToBeProcessed(filesToUpload);
            if(toBeProcessed.length <= 0) break;
            for(let q of toBeProcessed)
            {
                // console.log("processing", q)
                q.dimensionTags = {};
                q.tags = {};
                var ab = await this.getArrayBuffer(q);
                if(Helper.isImage(q.fileType))
                {
                   try{
                     var imgDimensions = await this.imageService.GetImageDimensions(ab, q.fileType, camanCanvasId);
                     q.dimensionTags = Helper.imageDimensionsToTags(imgDimensions);
                   }catch(e){
                      modal.showErrorPrompt("Error while procesing file "+q.fileName+"\n\n"+ e.toString())
                   }
  
                   if(extractExifTags)
                   {
                       try{
                           var metaTags = meta.ReadMetaInfoFromImage(ab);
                           q.tags = {...q.tags, ... metaTags };
       
                       }catch(e){
                           modal.showErrorPrompt("Error while procesing file "+q.fileName+"\n\n"+ e.toString())
                       }
                   }

                   if(executeTensorFlow)
                   {
                       try{
                           var metaTags = await this.classifierService.classifyToTags(ab, q.fileType, minProbability, tensorFlowContainerDomId);
                           q.tags = {...q.tags, ... metaTags };
       
                       }catch(e){
                           modal.showErrorPrompt("Error while classifying file "+q.fileName+"\n\n"+ e.toString())
                       }
                   }
                }
                else
                if(Helper.isVideo(q.fileType))
                {
                   try{
                     var vidDimensions = await this.videoService.getVideoResolutionByArrayBuffer(ab, q.fileType, videoContainerId);
                     q.dimensionTags = Helper.videoDimensionsToTags(vidDimensions);
   
                   }catch(e){
                     modal.showErrorPrompt("Error while procesing file "+q.fileName+"\n\n"+ e.toString())
                   }
                }
  
                this.refreshTagsCount(q);
                q.processed = true;
                processed++;
                // console.log("processed", processed)
            }
        }
        // console.log("completed")
    }
    public refreshTagsCount(q: FileToUpload)
    {
      q.tagsCount = Object.keys(q.tags).length + Object.keys(q.dimensionTags).length;
    }
    private static sizeOfFileToUpload(fileToUpload: FileToUpload)
    {
       return fileToUpload.arrayBuffer ? fileToUpload.arrayBuffer.byteLength : fileToUpload.file.size;
    }
    public async upload(destinationCatalog: ICatalog, filesToUpload: FileToUpload[]){
        // var callback = CatalogService.swallow;
        var sumFiles = 0;
        var sumSize = 0;
        for(var q of filesToUpload){
          sumFiles++;
          sumSize+= UploadService.sizeOfFileToUpload(q);
        }
        var eventCallbackManager = this.modalService.openEventCallbackForm("Uploading file(s)", true);
        eventCallbackManager.showProgressBar(sumFiles, sumSize);
        eventCallbackManager.callback(EventSeverity.Begin, "upload");
        var succeed = 0;
        var all = 0;
        for(let q of filesToUpload)
        {
            all++;
            try{
              eventCallbackManager.callback(EventSeverity.Info, "Reading file: "+q.fileName);
              var ab = await this.getArrayBuffer(q);
  
              var uploadDetails : UploadFileDetails = {
                  contentType: q.fileType,
                  filename: q.fileName,
                  mtime: q.file ? new Date(q.file.lastModified) : new Date(),
                  originalData: ab,
                  versions: [],
                  tags: {...q.tags, ...q.dimensionTags},
              };
              if(Helper.isImage(q.fileType))
              {
                 try
                 {
                    await this.createThumbnails(eventCallbackManager, ab, q.fileType, q, uploadDetails);
                 }
                 catch(e)
                 {
                    eventCallbackManager.callback(EventSeverity.Error, "Error while creating thumbnails for image: "+q.fileName+"\n\n"+e.toString());
                 }
  
                  // console.log("shit!", thumbnails, thumbnailKeys, uploadDetails); return;
              }
              else
              if(Helper.isVideo(q.fileType))
              {
                  try
                  {
                    eventCallbackManager.callback(EventSeverity.Info, "Extracting video preview");
                    var thumbnailFullResolution = await this.videoService.getVideoThumbnailByArrayBuffer(ab, q.fileType, videoContainerId);
  
                    await this.createThumbnails(eventCallbackManager, thumbnailFullResolution, DefaultCanvasSnapshotContentType, q, uploadDetails);
                  }
                  catch(e)
                  {
                    eventCallbackManager.callback(EventSeverity.Error, "Error while extracting preview of video: "+q.fileName+"\n\n"+e.toString());
                  }
              }
              eventCallbackManager.callback(EventSeverity.Info, "Uploading file");
              await destinationCatalog.uploadFile(uploadDetails, eventCallbackManager.callback);  
              eventCallbackManager.callback(EventSeverity.Info, "Succeed: "+q.fileName);

              eventCallbackManager.increaseProgress(UploadService.sizeOfFileToUpload(q));

              succeed++;
            }catch(e){
              eventCallbackManager.callback(EventSeverity.Error, "Error while processing file "+q.fileName+"\n\n"+e.toString())
            }
        }
        eventCallbackManager.callback(EventSeverity.Info, "Operation complete! All files: "+all+" Succeed: "+succeed);
        eventCallbackManager.callback(EventSeverity.End, "upload");
  
        if(eventCallbackManager.errors) return;
  
        this.router.navigate(['/catalog/display', destinationCatalog.getUniqueId()]);
    }

    private async createThumbnails(eventCallbackManager: IEventCallbackManager, sourceImage: ArrayBuffer, sourceImageContentType: string, q: FileToUpload, uploadDetails: UploadFileDetails)
    {
      eventCallbackManager.callback(EventSeverity.Info, "Creating thumbnails");
      var thumbnailKeys = Object.keys(thumbnailSizes);
  
      var resizes = await this.imageService.CreateThumbnails(
         sourceImage, 
         sourceImageContentType, 
         Object.values(thumbnailSizes), 
         camanCanvasId
      );
  
      for(let i of resizes)
      {
          var key = thumbnailKeys[i.Key];
          uploadDetails.versions.push({
            contentType: sourceImageContentType,
            versionName: key,
            data: i.Image,
          });
      }  
    }    
}
