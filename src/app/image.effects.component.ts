import { Component, ViewChild, OnInit, ComponentFactoryResolver } from '@angular/core';
import { WorldService } from './world.service';
import { Router, Params, ActivatedRoute } from '@angular/router';
import { ICatalog, CatalogFile } from './catalog.service';
import { HelperService, WindowUrl } from './helper.service';
import { ImageService, ImageEffects } from './image.service';
import { FormManager, FormBuilderService } from './formbuilder.service';
import { Validate } from './formbuilder.common';
import { Validators } from '@angular/forms';
import { UploadService, FileToUpload } from './upload.service';

class SaveForm {

  @Validate([Validators.required])
  public newFilename: string;
  
  @Validate([])
  public inheritTags: boolean = true;
}

const camanCanvasId = "imageEffectsEditor";

@Component({
  templateUrl: '../templates/image.effects.component.html',
})
export class ImageEffectsComponent implements OnInit {

  private currentCatalog: ICatalog;
  private hash: string;
  private previousCatalog: ICatalog;
  private imageUrl: WindowUrl = {};
  private catFile: CatalogFile;
  catFileName: string;
  imageTransformationInProgress: boolean = false;
  private imageTransformationCurrentPhase: string = "";

  private imageEffects: ImageEffects = new ImageEffects();

  private supportedEffects = {
    "None": "",
    "Vintage": "vintage",
    "Lomo": "lomo",
    "Clarity": "clarity",
    "Sin City": "sinCity",
    "Sunrise": "sunrise",
    "Cross Process": "crossProcess",
    "Orange Peel": "orangePeel",
    "Love": "love",
    "Grungy": "grungy",
    "Jarques": "jarques",
    "Pinhole": "pinhole",
    "Old Boot": "oldBoot",
    "Glowing Sun": "glowingSun",
    "Hazy Days": "hazyDays",
    "Her Majesty": "herMajesty",
    "Nostalgia": "nostalgia",
    "Hemingway": "hemingway",
    "Concentrate": "concentrate"
  }
  private supportedEffectNames: string[];
  private currentPreset: string = "";

  showPresets: boolean = true;
  sx : FormManager<SaveForm>;

  constructor
  (
      private world: WorldService,
      private route: ActivatedRoute, 
      private helperService: HelperService,
      private imageService: ImageService,
      private uploadService: UploadService,
      private formBuilderService: FormBuilderService, 
  )
  {
     this.supportedEffectNames = Object.keys(this.supportedEffects);

     this.sx = this.formBuilderService.BuildForm(SaveForm, async (form: SaveForm)=>{
          var arrayBuffer = await this.imageService.getArrayBuffer(camanCanvasId);

          var files: FileToUpload[] = [
            {
              arrayBuffer: arrayBuffer,
              dimensionTags: {},
              file: null,
              fileName: form.newFilename,
              fileType: this.catFile.getContentType(),
              processed: false,
              tags: form.inheritTags ? this.catFile.getTags() : {},
              tagsCount: 0,
              sizeHuman: "",
            }
          ]

          await this.uploadService.processFilesToUpload(files, false, false);

          await this.uploadService.upload(this.currentCatalog, files, {});
      
     });

  }



  resetFilters(){
    this.imageEffects = new ImageEffects();
    this.doCamanJob();
  }
  applyFilters(){
    this.doCamanJob();
  }

  setPreset(newPreset){
     this.currentPreset = this.supportedEffects[newPreset];
     this.doCamanJob();
  }

  ngOnInit() {
      this.hash = this.route.snapshot.params["hash"];

      this.world.rememberRoute(this.route.snapshot.params);

      this.world.openRootCatalog.subscribe(()=>{
        this.regenerate();
      });
      this.regenerate();
  }

  ngOnDestroy(){
     this.destroyImageUrl();
  }

  async regenerate() 
  {
     this.currentCatalog = this.world.getCurrentCatalog();
     if(!this.currentCatalog) return;
     if(this.previousCatalog == this.currentCatalog) return;

     this.previousCatalog = this.currentCatalog;
     
     this.catFile = this.currentCatalog.getFileByHash(this.hash);
     if(!this.catFile) return;
     this.catFileName = this.catFile.getFilename();
     var ab = await this.currentCatalog.downloadOriginalFile(this.catFile);
     this.generateImageUrl(ab, this.catFile.getContentType());

     this.doCamanJob();
  }

  doCamanJob(){
    var me = this;
    this.imageTransformationInProgress = true;
    document.getElementById("image-editor-container").innerHTML = "<img id='"+camanCanvasId+"' src='"+this.imageUrl.rawUrl+"'>";
    if(this.showPresets)
    {
      this.imageService.applyPreset("imageEffectsEditor", this.currentPreset, callback);
    }
    else
    {
      console.log(this.imageEffects)
      this.imageService.applyEffects("imageEffectsEditor", this.imageEffects, callback);
    }

    function callback(event: string){
        if(event.indexOf(' ') > 0)
           me.imageTransformationCurrentPhase = event;
        me.imageTransformationInProgress = (event != "processComplete");
    }

  }

  destroyImageUrl(){
    if(this.imageUrl) URL.revokeObjectURL(this.imageUrl.rawUrl);
  }
  generateImageUrl(ab: ArrayBuffer, contentType: string){
      this.destroyImageUrl();

      this.imageUrl = this.helperService.arrayBufferToSanitizedWindowUrl(ab, contentType);
  }

}
