import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ICatalog } from './catalog.service';
import {  StringKeyValuePairs } from './catalog.common';
import { MatTableDataSource } from '@angular/material/table';
import { Helper } from './helper';
import { MatSort } from '@angular/material/sort';
import { ModalService } from './modal.service';
import { ImageMetaInfoService } from './image.metainfo.service';
import { ImageService } from './image.service';
import { MatPaginator } from '@angular/material/paginator';
import { BoxService, BoxOperations } from './box.service';
import { Router } from '@angular/router';
import { VideoService } from './video.service';
import { FileToUpload, UploadService } from './upload.service';

export const TENSORFLOW_MIN_PROBABILITY = 0.5;

@Component({
  templateUrl: '../templates/catalog.upload.component.html',
})
export class CatalogUploadComponent implements OnInit, OnDestroy {
  destinationCatalogId: string;
  destinationCatalog: ICatalog;
  filesToUpload : FileToUpload[] = [];
  datasource : MatTableDataSource<FileToUpload>;
  backgroundProcessingInProgress: boolean = false;
  globalTags: StringKeyValuePairs = {};

  extractExifTags: boolean = true;
  executeTensorFlow: boolean = false;
  private tensorFlowMinProbability: number = TENSORFLOW_MIN_PROBABILITY;

  private allFiles = 0;
  private allTags = 0;
  private fullSize = 0;
  private fullSizeHuman = "0 MiB";
  columns = ["fileName", "tagsCount", "sizeHuman", "actions"];

  private box: BoxOperations<FileToUpload>;

  @ViewChild(MatSort, {static: true}) sort : MatSort;
  @ViewChild(MatPaginator, {static: true}) paginator: MatPaginator;

  private tagList: StringKeyValuePairs= {};
  constructor(
    private router: Router,
    private imageService: ImageService, 
    private videoService: VideoService, 
    private modalService: ModalService, 
    private metaService: ImageMetaInfoService,
    private boxService: BoxService,
    private uploadService: UploadService,
  ) 
  {
  }

  onDrop(files: FileList) {
    var fileList : File[] = [];
    // console.log(files, files.length);
    for(let i = 0; i < files.length; i++) 
    {      
       var item = files[i];
       // console.log("item!", item);
       fileList.push(item);
    }
    this.filesChanged(fileList);
  }

  removeFile(file: FileToUpload){
      Helper.deleteArrayValue(this.filesToUpload, file);
      this.rerender();
  }

  applyFilter(filterValue: string) {
    this.datasource.filter = filterValue.trim().toLowerCase();
  }

  concatFiles(files: File[]){
      for(let q of files){
          var type : string = q.type;
          if((!Helper.isImage(type))&&(!Helper.isVideo(type)))
             continue;
          this.filesToUpload.push({
              file: q,
              tagsCount: 0,
              tags: {},
              dimensionTags: {},
              fileName: q.name,
              fileType: q.type,
              sizeHuman: Helper.humanFileSize(q.size),
              processed: false,
          });
      }
  }
  filesChanged(files) {
      this.concatFiles(files);
      console.log(this.filesToUpload)
      this.rerender();
      this.kickOffProcessing();
  }
  async kickOffProcessing() {      
      if(this.backgroundProcessingInProgress) return;
      this.backgroundProcessingInProgress = true;
      try{
        await this.uploadService.processFilesToUpload(this.filesToUpload, this.extractExifTags, this.executeTensorFlow, this.tensorFlowMinProbability);
      }finally{
        this.backgroundProcessingInProgress = false;
        this.rerender();  
      }
  }
  
  display(q: FileToUpload)
  {
      this.box.display(q);
  }

  getFilesToBeProcessed(): FileToUpload[] {
     return this.filesToUpload.filter(x => !x.processed);
  }
  upload(){
      this.uploadService.upload(this.destinationCatalog, this.filesToUpload, this.globalTags);
  }

  rerender(){
    this.box.clear();

    this.allFiles = this.filesToUpload.length;
    this.fullSize = 0;
    this.allTags = 0;
    for(let q of this.filesToUpload) {
        this.box.addItem(q, q.fileName, q.fileType);

        this.fullSize += q.file.size;
        this.allTags += q.tagsCount;
    }
    this.fullSizeHuman = Helper.humanFileSize(this.fullSize);

    this.datasource = new MatTableDataSource<FileToUpload>(this.filesToUpload);
    this.datasource.sort = this.sort;    
    this.datasource.paginator = this.paginator;
  }

  async openTagEditor(element: FileToUpload)
  {
      var tags = await this.modalService.showTagEditor(element.tags, element.dimensionTags);
      if(tags == null) return;
      element.tags = tags;
      this.uploadService.refreshTagsCount(element);
      this.rerender();
  }

  ngOnDestroy() {
    // this.world.openRootCatalog.unsubscribe();

    this.box.close();
  }

  ngOnInit() {

      this.box = this.boxService.Build<FileToUpload>(
        async (item)=>{
          return await Helper.fileToArrayBuffer(item.file);
        }
      );
  }

}
