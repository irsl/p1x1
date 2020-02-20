import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ICatalog } from './catalog.service';
import {  StringKeyValuePairs, TagKeyValuePairs } from './catalog.common';
import { MatTableDataSource } from '@angular/material/table';
import { Helper, TagKeyValue } from './helper';
import { MatSort } from '@angular/material/sort';
import { ModalService } from './modal.service';
import { ImageMetaInfoService } from './image.metainfo.service';
import { ImageService } from './image.service';
import { MatPaginator } from '@angular/material/paginator';
import { BoxService, BoxOperations } from './box.service';
import { Router } from '@angular/router';
import { VideoService } from './video.service';
import { FileToUpload, UploadService } from './upload.service';
import { HelperService } from './helper.service';
import { SelectionModel } from '@angular/cdk/collections';
import { SafeUrl } from '@angular/platform-browser';

export const TENSORFLOW_MIN_PROBABILITY = 0.5;

const initialSelection = [];
const allowMultiSelect = true;

@Component({
  templateUrl: '../templates/catalog.upload.component.html',
})
export class CatalogUploadComponent implements OnInit, OnDestroy {
  private lastClickedRow: FileToUpload;
  private lastClickedPreview: SafeUrl;
  private lastClickedPreviewRawUrl: string;
  private lastClickedIsImage: boolean;
  showRightPane: boolean = false;
  private showRightPaneCurrent: boolean = false;
  private showMoreTags: boolean = false;
  private tagsToShow: TagKeyValue[] = [];
  private moreTagsToShow: TagKeyValue[] = [];

  destinationCatalogId: string;
  destinationCatalog: ICatalog;
  filesToUpload : FileToUpload[] = [];
  datasource : MatTableDataSource<FileToUpload>;
  backgroundProcessingInProgress: boolean = false;
  
  private selection: SelectionModel<FileToUpload>
    = new SelectionModel<FileToUpload>(allowMultiSelect, initialSelection);

  extractExifTags: boolean = true;
  executeTensorFlow: boolean = false;
  private tensorFlowMinProbability: number = TENSORFLOW_MIN_PROBABILITY;

  private allFiles = 0;
  private allTags = 0;
  private fullSize = 0;
  private fullSizeHuman = "0 MiB";
  columns = ["select", "fileName", "tagsCount", "sizeHuman", "actions"];

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
    private helperService: HelperService,
  ) 
  {
  }

  /** Whether the number of selected elements matches the total number of rows. */
isAllSelected() {
  const numSelected = this.selection.selected.length;
  const numRows = this.datasource.data.length;
  return numSelected == numRows;
}

/** Selects all rows if they are not all selected; otherwise clear selection. */
toggleSelection(row: FileToUpload){
  this.selection.toggle(row); 
  this.doShowRightPane(row);
}
masterToggleAndSelectionChanged(){
  this.masterToggle();
  this.doShowRightPane(null);
}
masterToggle() {
  this.isAllSelected() ?
      this.selection.clear() :
      this.datasource.data.forEach(row => this.selection.select(row));
}

async doShowRightPane(row: FileToUpload, rowClick?: boolean)
{
   var previousLastClicked = this.lastClickedRow;
   var previousShowRightPane = this.showRightPane;
   this.lastClickedIsImage = false;
   this.lastClickedRow = row;
   this.showRightPane = (this.lastClickedRow != null || (this.selection.selected.length > 0));
   this.showRightPaneCurrent = false;
   if(this.selection.selected.length <= 0)
      this.showRightPaneCurrent = true;
   else if((this.selection.selected.length == 1)&&(this.selection.selected[0] == this.lastClickedRow))
      this.showRightPaneCurrent = true;
   
   this.moreTagsToShow = [];
   this.showMoreTags = false;

   if((this.showRightPaneCurrent)&&(this.lastClickedRow)){
       this.lastClickedIsImage = Helper.isImage(this.lastClickedRow.fileType);

       if(previousLastClicked == this.lastClickedRow)
       {
         if(rowClick)
            this.showRightPane = !previousShowRightPane;
         return;
       }
       this.tagsToShow = Helper.tagsToHash(this.getAllTagsOfFile(this.lastClickedRow));

       if(this.lastClickedPreview)
       {
          window.URL.revokeObjectURL(this.lastClickedPreviewRawUrl);
       }
       this.lastClickedPreview = "";

       Helper.arrayBufferToDataUrl
       var ab = await Helper.fileToArrayBuffer(row.file);
       var w = this.helperService.arrayBufferToSanitizedWindowUrl(ab, row.fileType);
       this.lastClickedPreviewRawUrl = w.rawUrl;

       this.lastClickedPreview = w.safeUrl;
   } else {
      this.tagsToShow = Helper.tagsToHash( this.getTagsOfFiles(this.selection.selected) ); 
   }
   Helper.selectCustomAndGenericTags(this.tagsToShow, this.moreTagsToShow);
}
getAllTagsOfFile(file: FileToUpload): StringKeyValuePairs
{
  var re: StringKeyValuePairs = {...file.tags};
  for(let q of Object.keys(file.dimensionTags))
  {
    re[q] = file.dimensionTags[q].toString();
  }
  return re;
}
getTagsOfFiles(files: FileToUpload[]): StringKeyValuePairs
{
  var allTags = files.map(x=>this.getAllTagsOfFile(x));
  return Helper.intersectTags(allTags);
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

  removeSelectedFiles(){
    this.removeFiles(this.selection.selected);
  }

  removeFile(file: FileToUpload){
      this.removeFiles([file]);
  }
  removeFiles(files: FileToUpload[]){
    for(let q of files) {
      Helper.deleteArrayValue(this.filesToUpload, q);
    }
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
      this.uploadService.upload(this.destinationCatalog, this.filesToUpload);
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

  editTagsOfSelectedFiles()
  {
    this.editTagsOfFiles(this.selection.selected);
  }
  async editTagsOfFiles(files: FileToUpload[])
  {
    var allTagKeys = this.destinationCatalog ? Array.from(this.destinationCatalog.getTagKeysRecursively()) : [];
    var imageUrl = null;
    var w;
    if((files.length == 1)&&(Helper.isImage(files[0].fileType)))
    {
      var ab = await Helper.fileToArrayBuffer(files[0].file);
      w = this.helperService.arrayBufferToSanitizedWindowUrl(ab, files[0].fileType);

      imageUrl = w.safeUrl;
    }
    
    var allOriginalTags = this.getTagsOfFiles(files);
    var classifiedOriginalTags = Helper.classifyTags(allOriginalTags);
    var originalTags = classifiedOriginalTags.unprotectedTags;

    try {
      var editedTags = await this.modalService.showTagEditor(originalTags, allTagKeys, imageUrl, classifiedOriginalTags.protectedTags);
      if(editedTags == null) return;

      for(let file of files) {
        var aTags = file.tags;
  
        // removing the tags that were originally present
        for(let originalTagKey of Object.keys(originalTags))
        {
           delete aTags[originalTagKey];
        }
  
        // and assigning the final ones:
        for(let editedTagKey of Object.keys(editedTags))
        {
          aTags[editedTagKey] = editedTags[editedTagKey];
        }
        file.tagsCount = Object.keys(aTags).length;
        file.tags = aTags;

        this.uploadService.refreshTagsCount(file);
      }

      this.rerender();
      var lc = this.lastClickedRow; this.lastClickedRow = null; this.doShowRightPane(lc);

    }finally {        
      if(imageUrl)
      {
        window.URL.revokeObjectURL(w.rawUrl);
      }
    }


  }
  doShowMoreTags(){
    this.showMoreTags=true;
    return false;
  }
  
  async openTagEditor(element: FileToUpload)
  {    
      return this.editTagsOfFiles([element]);
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
