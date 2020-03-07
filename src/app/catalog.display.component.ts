import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { WorldService, ICatalogRoute, RootCatalogName, PixiUserSettings } from './world.service';
import { Filter, IFilter } from './filter';
import { CatalogAndCatalogFile, ICatalog, CatalogCapability, CatalogFile, StandardCatalog, StandardCatalogProtected, StandardCatalogClear, CombinedCatalog, UploadFileDetails, CatalogFileVersionWithData } from './catalog.service';
import { EventSeverity, TagNameContentType, StringKeyValuePairs } from './catalog.common';
import { Helper, TagKeyValue } from './helper';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortHeader, SortDirection } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { ModalService } from './modal.service';
import { SelectionModel } from '@angular/cdk/collections';
import { saveAs } from 'file-saver';
import { ThumbnailKeySmall, ThumbnailKeyMedium } from './upload.service';
import { PixiJsZip } from './jszip';
import { BoxService, BoxOperations } from './box.service';
import { CloudData } from 'angular-tag-cloud-module';
import { Subscription, Observable } from 'rxjs';
import { HelperService } from './helper.service';
import { ActivatedRoute, Params } from '@angular/router';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { MatChipInputEvent } from '@angular/material/chips';
import { ENTER, COMMA } from '@angular/cdk/keycodes';

const viewTypeLargeIcons = "largeIcons";
const viewTypeLargeIconsWithFilenames = "largeIconsWithFilenames";
const viewTypeTable = "table";

interface CatalogAndCatalogFileInfo {
   original: CatalogAndCatalogFile,
   filename: string,
   fileHash: string,
   uploadDate: string,
   creationDateBestGuess: string,
   fileSize: number,
   fileSizeHuman: string,
   tagCount: number;
}
interface ThumbnailAndCatalogAndCatalogFileInfo {
   catInfo: CatalogAndCatalogFileInfo;
   thumbnail: string;
}
const initialSelection = [];
const allowMultiSelect = true;
const tagStatisticsHeadCount = 6;

@Component({
  templateUrl: '../templates/catalog.display.component.html',
})
export class CatalogDisplayComponent implements OnInit, OnDestroy {

  catalogRoute: ICatalogRoute;
  hits: CatalogAndCatalogFileInfo[];
  sortedData: CatalogAndCatalogFileInfo[];
  columns = ["select", "filename", "tagCount", "fileSizeHuman", "uploadDate"];
  datasource : MatTableDataSource<CatalogAndCatalogFileInfo>;
  private sumSumFileSizeHuman: string;
  private allTags: number;
  filter: IFilter;
  filterError: string;
  showRightPane: boolean = false;
  private showRightPaneCurrent: boolean = false;
  private currentCatalog: ICatalog;

  showQuickAddTag: boolean = false;
  quickTag: string = "";
  availableSortModes: string[] = ["filename", "tagCount", "fileSize", "uploadDate", "creationDateBestGuess"];

  private largeIconsPageSubscriptionWF: Subscription;
  private largeIconsPageSubscription: Subscription;

  viewType = viewTypeTable;

  private allWriteable: boolean = false;
    
  private lastClickedRow: CatalogAndCatalogFileInfo;
  private lastClickedPreview: string;
  private lastClickedIsImage: boolean;

  private prevSortDirection: SortDirection = null;
  private prevSortActive: string = null;

  private showMoreTags: boolean = false;
  private tagsToShow: TagKeyValue[] = [];
  private moreTagsToShow: TagKeyValue[] = [];
  currentViewWithLargeIcons: ThumbnailAndCatalogAndCatalogFileInfo [] = [];
  currentViewWithLargeIconsWF: ThumbnailAndCatalogAndCatalogFileInfo [] = [];

  private selection: SelectionModel<CatalogAndCatalogFileInfo>
    = new SelectionModel<CatalogAndCatalogFileInfo>(allowMultiSelect, initialSelection);

  private box: BoxOperations<CatalogAndCatalogFileInfo>;

  private tagStatisticsRest: CloudData[] = [];
  private tagStatisticsHead: CloudData[] = [];
  private contentTypesStatistics: CloudData[] = [];
  private shareFilesClear: boolean = false;
  private shareFilesProtected: boolean = false;

  @ViewChild(MatSort, {static: true}) sort : MatSort;
  @ViewChild('tablePaginator', {static: true}) tablePaginator: MatPaginator;
  @ViewChild('largeIconsPaginator', {static: true}) largeIconsPaginator: MatPaginator;
  @ViewChild('largeIconsPaginatorWF', {static: true}) largeIconsPaginatorWF: MatPaginator;

  private userSettings: PixiUserSettings;
  
  tagsForTypeahead = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map(term => term.length < 1 ? []
        : Array.from(this.currentCatalog.getTagKeysRecursively()).filter(v => v.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10))
    )
    
  tagsToBeAdded: StringKeyValuePairs = {};    
  tagsToBeAddedList: TagKeyValue[] = [];
  readonly separatorKeysCodes: number[] = [ENTER, COMMA];

  constructor(
    private route: ActivatedRoute, 
    private world: WorldService, 
    private modal: ModalService,
    private boxService: BoxService,
    private helperService: HelperService,
  )
  {
  }

  private tagsToStrList(){
    this.tagsToBeAddedList = [...Helper.tagsToHash(this.tagsToBeAdded)];
  }
  doShowQuickTag(){
    this.showQuickAddTag = true;
  }
  removeQuickTag(tag: TagKeyValue){
    delete this.tagsToBeAdded[tag.key];
    this.tagsToStrList();
  }
  async addQuickTag(event: MatChipInputEvent){
    const input = event.input;
    const value = (event.value || "").trim();
    if(!value)
    {
      // and now we need to save them all
      var files : CatalogAndCatalogFileInfo[] = this.selection.selected.length ? this.selection.selected : [this.lastClickedRow];

      var tags : StringKeyValuePairs = {...this.tagsToBeAdded};
      this.tagsToBeAdded = {};
      this.tagsToStrList();
      var lc = this.lastClickedRow;
      return this.completeEditTagsOfFiles(files, tags, null, true) // null => we are not removing anything
        .then(()=>{
           this.doShowRightPane(lc);
        })
    }

    // Add our fruit
    if (value) {
        var x = value.split("=", 2);
        if((x[0])&&(!Helper.isRestrictedTagNamespace(x[0])))
        {
          this.tagsToBeAdded[x[0]] = x[1] || "";
          this.tagsToStrList();
        }
    }

    // Reset the input value
    if (input) {
      input.value = '';
    }
  }

  private setSortMode(newMode:string, direction: "asc"|"desc"){
    //see: https://github.com/angular/components/issues/10242

    //reset state so that start is the first sort direction that you will see
    this.sort.sort({ id: null, start: direction, disableClear: false });
    this.sort.sort({ id: newMode, start: direction, disableClear: false });

    //ugly hack
    var header = (this.sort.sortables.get(newMode) as MatSortHeader);
    if(header)
       header._setAnimationTransitionState({ toState: "active" });

    this.prepareLargeIcons();

    this.userSettings.display.sort.id = newMode;
    this.userSettings.display.sort.direction = direction;
    this.world.saveUserSettings();
  }
  prepareLargeIcons(){
    if(this.viewType == viewTypeLargeIcons)
       this.prepareCurrentLargeIconsSubSet();
    if(this.viewType == viewTypeLargeIconsWithFilenames)
       this.prepareCurrentLargeIconsSubSetWF();
  }

  ngOnDestroy() {
    // this.world.openRootCatalog.unsubscribe();
    this.box.close();

    this.largeIconsPageSubscription.unsubscribe();
    this.largeIconsPageSubscriptionWF.unsubscribe();
  }

  ngOnInit() {
    this.userSettings = this.world.getUserSettings();
    this.setViewMode(this.userSettings.display.viewType || viewTypeTable);
    this.setSortMode(this.userSettings.display.sort.id || "uploadDate", this.userSettings.display.sort.direction||"desc");

    this.world.openRootCatalog.subscribe(()=>{
        this.regenerate(this.route.snapshot.params);
    });

    this.box = this.boxService.Build(async (item: CatalogAndCatalogFileInfo)=>{
       return await item.original.catalog.downloadOriginalFile(item.original.file);
    });

    this.regenerate(this.route.snapshot.params);
    this.route.params.subscribe((params)=>{
      this.regenerate(params);
    })

    this.largeIconsPageSubscription = this.largeIconsPaginator.page.subscribe(()=>{
      this.prepareCurrentLargeIconsSubSet();
    });
    this.largeIconsPageSubscriptionWF = this.largeIconsPaginatorWF.page.subscribe(()=>{
      this.prepareCurrentLargeIconsSubSetWF();
    });

  }

  async downloadSelectedFilesAsZip()
  {    
    var jsZip = PixiJsZip.CreateNewJsZip();
    var eventCallbackManager = this.modal.openEventCallbackForm("Building zip file", true);
  
    try{
      for(let q of this.selection.selected)
      {
         var fn = q.filename;
         eventCallbackManager.callback(EventSeverity.Info, "Downloading file: "+fn);
         var ab = await q.original.catalog.downloadOriginalFile(q.original.file);       
         jsZip.file(q.filename, ab)
      }
  
      eventCallbackManager.callback(EventSeverity.Info, "Building the zip file...");
      var blob = await jsZip.generateAsync({type:"blob"});

      eventCallbackManager.callback(EventSeverity.Info, "Ready!");
      var now = Helper.nowUnixtime();
      saveAs(blob, this.currentCatalog.getShortId()+"-"+now+".zip");

      eventCallbackManager.autoCloseUnlessWarnings();  
  
    }catch(e){
      eventCallbackManager.callback(EventSeverity.Error, "Error while building the zip archive: "+e.toString());
    }
  }
  private getUniqueCatalogs(files: CatalogAndCatalogFileInfo[]): ICatalog
  {
     var set = new Set<ICatalog>();
     var re = new CombinedCatalog();
     for(let q of files)
     {
       set.add(q.original.catalog);
     }
     for(let q of Array.from(set)){
        re.AddSubCatalog(q);
     }
     return re;
  }
  async completeEditTagsOfFiles(files: CatalogAndCatalogFileInfo[], editedTags: StringKeyValuePairs, originalTags: StringKeyValuePairs, closeImmediately: boolean){
    if((editedTags == null)||(Object.keys(editedTags).length <= 0)) return;
    for(let file of files){
      var aTags = file.original.file.getTags();

      // removing the tags that were originally present
      if(originalTags != null)
      {
        for(let originalTagKey of Object.keys(originalTags))
        {
           delete aTags[originalTagKey];
        }  
      }

      // and assigning the final ones:
      for(let editedTagKey of Object.keys(editedTags))
      {
        aTags[editedTagKey] = editedTags[editedTagKey];
      }
      file.tagCount = Object.keys(aTags).length;
      file.original.file.tags = aTags;
    }

    var eventCallbackManager = this.modal.openEventCallbackForm("Saving tags", true);
    eventCallbackManager.dontCloseAutomatically = true;
    try{
      var cats = {};
      for(let file of files){
        eventCallbackManager.callback(EventSeverity.Info, "Saving tags for file: "+file.filename);
        await file.original.catalog.saveFileMeta(file.original.file, eventCallbackManager.callback);
        cats[file.original.catalog.getUniqueId()] = file.original.catalog;
      }

      for(let q of Object.values(cats)){
         var a: ICatalog = q as ICatalog;
         await a.initializeTags();
      }
      if(!closeImmediately) {
        eventCallbackManager.autoCloseUnlessWarnings();
        this.rerender();
      } else {
        eventCallbackManager.dismissUnlessWarnings();
      }
      
    }catch(e){
      eventCallbackManager.callback(EventSeverity.Error, "Error while saving new tags: "+e.toString())
    }
  }
  async editTagsOfFiles(files: CatalogAndCatalogFileInfo[]){
    var allOriginalTags = this.getTagsOfFiles(files);
    var classifiedOriginalTags = Helper.classifyTags(allOriginalTags);
    var originalTags = classifiedOriginalTags.unprotectedTags;

    var uniqCatalogs : ICatalog = this.getUniqueCatalogs(files);    
    var allUniqTags = Array.from(uniqCatalogs.getTagKeysRecursively());
    // console.log("tags for autocomplete", allUniqTags);
    var imageUrl = null;
    if((files.length == 1)&&(files[0].original.file.isImage()))
    {
      var tb = await files[0].original.catalog.downloadFileVersion(files[0].original.file, ThumbnailKeyMedium);
      if(tb) 
      {
        imageUrl = await Helper.arrayBufferToDataUrl(tb, files[0].original.file.getContentType())
      }
    }
    var editedTags = await this.modal.showTagEditor(originalTags, allUniqTags, imageUrl, classifiedOriginalTags.protectedTags);
    await this.completeEditTagsOfFiles(files, editedTags, originalTags, false);
  }

  editTagsOfSelectedFiles(){
     this.editTagsOfFiles(this.selection.selected);
  }
  openTagEditor(element: CatalogAndCatalogFileInfo)
  {
      this.editTagsOfFiles([element]);
  }

/** Whether the number of selected elements matches the total number of rows. */
isAllSelected() {
  const numSelected = this.selection.selected.length;
  const numRows = this.datasource.data.length;
  return numSelected == numRows;
}

/** Selects all rows if they are not all selected; otherwise clear selection. */
toggleSelection(row: CatalogAndCatalogFileInfo){
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

async share()
{
  var selectedFiles : CatalogFile[];
  if(this.selection.selected.length)
  {
     selectedFiles = this.selection.selected.map(x => x.original.file);
  }
  else 
  {
     selectedFiles = [this.lastClickedRow.original.file];
  }

  var fragment = null;
  var sharedCatalogUrl;
  if(this.shareFilesProtected)
  {
     var resProt = await this.modal.showProtectedShareForm(url);
     if(!resProt) return;
     console.log("form just returned: ", resProt)
     var eventManager = this.modal.openEventCallbackForm("Sharing files in a new protected catalog", true);
     sharedCatalogUrl = await (this.currentCatalog as StandardCatalogProtected).shareFilesProtected(resProt.shareName, resProt.password, resProt.comment, selectedFiles, resProt.expiration.toTotalSeconds(), eventManager.callback);
     eventManager.dismissUnlessWarnings();

     if(resProt.generateRandomPassword)
     {
       fragment = resProt.password
     }
  }
  else if(this.shareFilesClear)
  {
     var resClear = await this.modal.showClearShareForm(url);
     if(!resClear) return;
     var eventManager = this.modal.openEventCallbackForm("Sharing files in a new protected catalog", true);
     sharedCatalogUrl = await (this.currentCatalog as StandardCatalogClear).shareFilesClear(resProt.shareName, selectedFiles, resProt.expiration.toTotalSeconds(), eventManager.callback);
     eventManager.dismissUnlessWarnings();
  }
  else
  {
    //  what?
    return;
  }

  // now we need to render the final url to the angular component
  var url = this.helperService.generateExternalUrlForComponents(['catalog/shared/open', sharedCatalogUrl], fragment);

  // and display it to the user
  this.modal.showShareResultPopup(url);
}
async rerender()
{
  this.showRightPane = false;
  this.hits = null;
  this.currentCatalog = this.world.getCurrentCatalog();
  if(!this.currentCatalog) 
  {
     console.log("The selected catalog could not be found?!", this.catalogRoute.currentlySelectedCatalogId);
     return;
  }

  this.shareFilesClear = this.currentCatalog.getCapabilities().has(CatalogCapability.ShareFilesClear);
  this.shareFilesProtected = this.currentCatalog.getCapabilities().has(CatalogCapability.ShareFilesProtected);

  this.selection = new SelectionModel<CatalogAndCatalogFileInfo>(allowMultiSelect, initialSelection);
  this.allTags = 0;
  var sumSumFileSize = 0;
  var files = await this.currentCatalog.getFilesRecursively(this.filter);

  this.hits = [];
  for(let q of files) {
    var aFileSize = q.file.getContentSize();
    var a : CatalogAndCatalogFileInfo = {
      original: q,
      tagCount: q.file.getTagCount(),
      filename: q.file.getFilename(),
      fileHash: q.file.getSha256Hash(),
      fileSize: q.file.getContentSize(),
      fileSizeHuman: Helper.humanFileSize(aFileSize),
      uploadDate: Helper.humanTimestamp(q.file.getUploadDate()),
      creationDateBestGuess: Helper.humanTimestamp(q.file.getCreationDateBestGuess()),
    };
    this.hits.push(a);

    sumSumFileSize += aFileSize;
    this.allTags += a.tagCount;
  }

  this.sumSumFileSizeHuman = Helper.humanFileSize(sumSumFileSize);

  this.datasource = new MatTableDataSource<CatalogAndCatalogFileInfo>(this.hits);
  this.datasource.sort = this.sort;
  this.sort.sortChange.subscribe(()=>{this.initSortData()});
  this.initSortData(true);
  

  // turning matsort into case-insensitive
  this.datasource.sortingDataAccessor = (data: any, sortHeaderId: string): string => {
    if (typeof data[sortHeaderId] === 'string') {
      return data[sortHeaderId].toLocaleLowerCase();
    }
  
    return data[sortHeaderId];
  };
  this.datasource.paginator = this.tablePaginator;

  this.largeIconsPaginator.pageIndex = 0;
  this.largeIconsPaginator.length = this.hits.length;
  this.largeIconsPaginatorWF.pageIndex = 0;
  this.largeIconsPaginatorWF.length = this.hits.length;
  this.prepareLargeIcons();
}

initSortData(force: boolean = false){
  if((!force)&&(this.prevSortActive == this.datasource.sort.active)&&(this.prevSortDirection == this.datasource.sort.direction)) return;
  this.prevSortActive = this.datasource.sort.active;
  this.prevSortDirection = this.datasource.sort.direction;
  this.sortedData = this.datasource.sortData(this.datasource.filteredData,this.datasource.sort);

  this.box.clear();
  for(let a of this.sortedData) {
    this.box.addItem(a, a.filename, a.original.file.getContentType());
  }  
}

setViewMode(newType: string){
  this.showQuickAddTag = false;
  this.viewType = newType;
  this.prepareLargeIcons();
  this.userSettings.display.viewType = newType;
  this.world.saveUserSettings();
}
async prepareCurrentLargeIconsSubSetGeneric(view: ThumbnailAndCatalogAndCatalogFileInfo[], paginator: MatPaginator)
{
  view.splice(0, view.length);

  //see: https://github.com/angular/components/issues/9205

  var begin = paginator.pageIndex*paginator.pageSize;  
  for(var i = begin; i < begin + paginator.pageSize; i++)
  {        
      var hit = this.sortedData[i];
      if(!hit) break;

      view.push({
         catInfo: hit,
         thumbnail: "", // TODO: some default generic pic
      });
  }

  for(var q of view) {
      try
      {
        var ab = await q.catInfo.original.catalog.downloadFileVersion(q.catInfo.original.file, ThumbnailKeySmall);
        q.thumbnail = await Helper.arrayBufferToDataUrl(ab, q.catInfo.original.file.getContentType());  
      }catch(e)
      {
        // swallow        
      }
  }
}
async prepareCurrentLargeIconsSubSetWF(){
  return this.prepareCurrentLargeIconsSubSetGeneric(this.currentViewWithLargeIconsWF, this.largeIconsPaginatorWF);
}
async prepareCurrentLargeIconsSubSet(){
  return this.prepareCurrentLargeIconsSubSetGeneric(this.currentViewWithLargeIcons, this.largeIconsPaginator);
}

tagClicked(stuff: CloudData) {
  this.world.navigateToSearch("tag:"+Filter.escapeTag(stuff.text)+"=*");
}
contentTypeClicked(stuff: CloudData) {
  this.world.navigateToSearch("tag:content.type="+Filter.escapeTag(stuff.text));
}
showAllTags(){
  this.tagStatisticsHead = [...this.tagStatisticsHead, ...this.tagStatisticsRest];
  this.tagStatisticsRest = [];
}

  async regenerate(params: Params) {
    this.catalogRoute = this.world.rememberRoute(params);
    this.filter = null;
    this.filterError = "";
    try{
      this.filter = Filter.compile(this.catalogRoute.searchPhrase);
    }catch(e){
      this.filterError = e.toString();
      return;
    }

    
    if(this.currentCatalog != null)
    {      
      this.tagStatisticsRest = Helper.transformTagStatisticsToCloudData(this.currentCatalog.getTagStatisticsRecursively({hideProtectedTags: true}), true);
      this.tagStatisticsHead = this.tagStatisticsRest.splice(0, tagStatisticsHeadCount);
      this.contentTypesStatistics = Helper.transformTagStatisticsToCloudData(this.currentCatalog.getTagStatisticsRecursively({tagPrefix: TagNameContentType, aggregateValues: false}), true);  
    }
  
    await this.rerender();
  }
  async doShowRightPane(c: CatalogAndCatalogFileInfo, rowClick?: boolean)
  {
     var previousLastClicked = this.lastClickedRow;
     var previousShowRightPane = this.showRightPane;
     this.lastClickedIsImage = false;
     this.lastClickedRow = c;
     this.showRightPane = (this.lastClickedRow != null || (this.selection.selected.length > 0));
     this.showRightPaneCurrent = false;
     if(this.selection.selected.length <= 0)
        this.showRightPaneCurrent = true;
     else if((this.selection.selected.length == 1)&&(this.selection.selected[0] == this.lastClickedRow))
        this.showRightPaneCurrent = true;
     
     var filesOperable : CatalogAndCatalogFileInfo[] = this.selection.selected;
     if((this.selection.selected.length == 0)&&(this.lastClickedRow))
         filesOperable = [this.lastClickedRow];
     var writeables = filesOperable.filter(x => x.original.catalog.isWriteable()).length;
     this.allWriteable = (writeables == filesOperable.length);
     // console.log("files operable", filesOperable, this.allWriteable)

     // it did not work anyway:
     // location.hash = "info-panel";
     this.showMoreTags = false;
     this.moreTagsToShow = [];
     if(this.showRightPaneCurrent){
         this.lastClickedIsImage = Helper.isImage(this.lastClickedRow.original.file.getContentType());

         // refreshing tags here as they might have changed via the quick tag editor feature
         this.tagsToShow = Helper.tagsToHash(this.lastClickedRow.original.file.getTags());

         if(previousLastClicked == this.lastClickedRow)
         {
           if(rowClick)
              this.showRightPane = !previousShowRightPane;
           return;
         }
         this.lastClickedPreview = "";

         var tb = await c.original.catalog.downloadFileVersion(c.original.file, ThumbnailKeyMedium);
         if(!tb) return;
         this.lastClickedPreview = await Helper.arrayBufferToDataUrl(tb, c.original.file.getContentType())
     } else {
        this.tagsToShow = Helper.tagsToHash( this.getTagsOfFiles(this.selection.selected) ); 
     }
     Helper.selectCustomAndGenericTags(this.tagsToShow, this.moreTagsToShow);
  }
  doShowMoreTags(){
    this.showMoreTags=true;
    return false;
  }
  getTagsOfFiles(files: CatalogAndCatalogFileInfo[]): StringKeyValuePairs{
    var allTags = files.map(x=>x.original.file.getTags());
    return Helper.intersectTags(allTags);
  }
  removeSelectedFiles()
  {
     this.removeFiles(this.selection.selected);
  }
  removeFile(q: CatalogAndCatalogFileInfo)
  {
     this.removeFiles([q]);
  }
  async removeFiles(files: CatalogAndCatalogFileInfo[])
  {
     var eventCallbackManager = this.modal.openEventCallbackForm("Remove file(s)", true);
     for(let q of files) {
        eventCallbackManager.callback(EventSeverity.Info, "Removing file: "+q.filename);
        await q.original.catalog.removeFile(q.original.file, eventCallbackManager.callback);
     }
     eventCallbackManager.autoCloseUnlessWarnings();

     await this.rerender();
  }
  moveFile(file: CatalogAndCatalogFileInfo)
  {
    return this.moveFiles([file]);
  }
  moveSelectedFiles()
  {
    return this.moveFiles(this.selection.selected);
  }
  async moveFiles(files: CatalogAndCatalogFileInfo[]): Promise<void>
  {
     var writeableCatalogs = this.world.combinedCatalog.getWriteableSubcatalogsRecursively();
     var destinationCatalog : ICatalog = await this.modal.showCatalogChooser("Select destination catalog", writeableCatalogs);
     if(!destinationCatalog) return;

     console.log("just returned", destinationCatalog, files)

     var events = this.modal.openEventCallbackForm(`Moving ${files.length} files to destination catalog ${destinationCatalog.getUniqueId()}`, true);
     events.dontCloseAutomatically = true;
     for(let q of files)
     {
        if(destinationCatalog.getUniqueId() == q.original.catalog.getUniqueId())
        {
          events.callback(EventSeverity.Info, `Not moving file ${q.filename} as it is already in the destination catalog`);
          continue;
        }

        events.callback(EventSeverity.Info, `Moving file: ${q.filename}`);

        events.callback(EventSeverity.Info, `Downloading the original.`);
        var ab = await q.original.catalog.downloadOriginalFile(q.original.file);

        var uploadDetails : UploadFileDetails = {
          contentType: q.original.file.getContentType(),
          filename: q.filename,
          mtime: q.original.file.getMtimeDate(),
          originalData: ab,
          tags: q.original.file.tags,
          versions: [],
        };
        for(let v of q.original.file.versions)
        {
           events.callback(EventSeverity.Info, `Downloading file version ${v.versionName}`);
           var versionData = await q.original.catalog.downloadFileVersion(q.original.file, v.versionName);
           var cd: CatalogFileVersionWithData = {
             contentType: v.contentType,
             versionName: v.versionName,
             data: versionData,
           }
           uploadDetails.versions.push(cd);
        }
        
        events.callback(EventSeverity.Info, `Uploading to the destination.`);
        await destinationCatalog.uploadFile(uploadDetails, events.callback);

        events.callback(EventSeverity.Info, `Removing from source catalog.`);
        q.original.catalog.removeFile(q.original.file, events.callback);
     }

     events.callback(EventSeverity.Info, `Operation was completed successfully.`);
     events.autoCloseUnlessWarnings();

     await this.rerender();
  }
  async download(q: CatalogAndCatalogFileInfo)
  {
     var ab = await q.original.catalog.downloadOriginalFile(q.original.file);
     var blob = Helper.ArrayBufferToBlob(ab, q.original.file.getContentType());
     saveAs(blob, q.filename);
  }

  display(q: CatalogAndCatalogFileInfo)
  {
      this.box.display(q);
  }

}
