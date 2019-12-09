import { Component, Input, OnInit, ViewChild, Directive, AfterContentInit, ElementRef, EventEmitter, Output, HostListener } from "@angular/core";
import { StringKeyValuePairs, TagKeyValuePairs } from "./catalog.common";
import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {MatChipInputEvent} from '@angular/material/chips';
import { MatTableDataSource } from "@angular/material/table";
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { Helper, TagKeyValue } from "./helper";
import { FormControl } from "@angular/forms";
import { ModalService } from "./modal.service";
import { ICatalog, StandardCatalogProtected } from "./catalog.service";
import { WorldService, RootCatalogName } from "./world.service";
import { ActivatedRoute } from "@angular/router";

@Component({
    selector: "tag-editor",
    templateUrl: '../templates/tag-editor.component.html',
})
export class TagEditorComponent implements OnInit {
    @Input("tags")
    tags: StringKeyValuePairs;    

    @Input("protectedTags")
    protectedTags: TagKeyValuePairs;    

    @Input("showTableSwitcher")
    showTableSwitcher: boolean = true;    

    tagValueList: TagKeyValue[] = [];

    @ViewChild(MatSort, {static: true}) sort : MatSort;
    @ViewChild(MatPaginator, {static: true}) paginator: MatPaginator;

    visible = true;
    selectable = true;
    addOnBlur = true;
    showTableView = false;
    
    datasource : MatTableDataSource<TagKeyValue>;
    columns = ["key", "value", "actions"];
    readonly separatorKeysCodes: number[] = [ENTER, COMMA];
  
    constructor(){
    }
  
    toggle(){
        this.showTableView=true;
        return false;
    }
    add(event: MatChipInputEvent): void {
      const input = event.input;
      const value = (event.value || "").trim();
  
      // Add our fruit
      if (value) {
          var x = value.split("=", 2);
          if((x[0])&&(!Helper.isRestrictedTagNamespace(x[0])))
          {
            this.tags[x[0]] = x[1] || "";
            this.tagsToStrList();
          }
      }
  
      // Reset the input value
      if (input) {
        input.value = '';
      }
    }
    removable(tag: TagKeyValue): boolean {
        return !Helper.isRestrictedTagNamespace(tag.key);
    }
    remove(tag: TagKeyValue): void {
        delete this.tags[tag.key];
        this.tagsToStrList();
    }

    applyFilter(filterValue: string) {
        this.datasource.filter = filterValue.trim().toLowerCase();
    }

    private tagsToStrList(){
        this.tagValueList = [...Helper.tagsToHash(this.protectedTags||{}), ...Helper.tagsToHash(this.tags)];

        var previousFilter = this.datasource!= null ? this.datasource.filter : "";
        this.datasource = new MatTableDataSource<TagKeyValue>(this.tagValueList);
        this.datasource.sort = this.sort;    
        this.datasource.paginator = this.paginator;
        this.datasource.filter  = previousFilter;
    }

    ngOnInit(): void {
        this.tagsToStrList();
    }

}


@Directive({
    selector: '[autoFocus]'
})
export class AutofocusDirective implements AfterContentInit {

    @Input() public appAutoFocus: boolean;

    public constructor(private el: ElementRef) {

    }

    public ngAfterContentInit() {

        setTimeout(() => {

            this.el.nativeElement.focus();

        }, 500);

    }

}


@Component({
    selector: 'catalogWritableSelection',
    templateUrl: "../templates/catalog.writeables.component.html"
  })
export class CatalogWriteablesComponent implements OnInit 
{

    private writeableCatalogs: ICatalog[]= [];
    writeableCatalogNames: string[]= [];

    private desiredDestinationCatalogId: string;

    @Input('destinationCatalogId')        destinationCatalogId: string;
    @Output('destinationCatalogIdChange') private destinationCatalogIdEvent = new EventEmitter<string>();

    @Input('destinationCatalog')          private destinationCatalog: ICatalog;
    @Output('destinationCatalogChange')   private destinationCatalogEvent = new EventEmitter<ICatalog>();

    private destinationIsProtected: boolean;
  
    constructor(
        private world: WorldService, 
        private route: ActivatedRoute,       
    ) {        
    }

    ngOnInit() {

        var params = this.route.snapshot.params;
        this.desiredDestinationCatalogId = params["catalogId"] || RootCatalogName;

        this.findCatalog();

        this.world.openRootCatalog.subscribe(()=>{
            this.findCatalog();
        });        
    }

    findCatalog(){
        this.writeableCatalogs = this.world.combinedCatalog.getWriteableSubcatalogsRecursively();
        this.writeableCatalogNames = this.writeableCatalogs.map(x=>x.getUniqueId())
  
        if(this.writeableCatalogNames.indexOf(this.desiredDestinationCatalogId) > -1)
        {
            this.destinationCatalogId = this.desiredDestinationCatalogId;
        }
        if((this.desiredDestinationCatalogId == RootCatalogName)&&(this.writeableCatalogNames.length == 1))
        {
          this.destinationCatalogId = this.writeableCatalogNames[0];
        }
  
        this.catalogChanged()
    }
    shit(){
        console.log("shitting")
        this.destinationCatalogIdEvent.emit(this.destinationCatalogId);
    }

    catalogChanged(){
        var i = this.writeableCatalogNames.indexOf(this.destinationCatalogId);
        if(i < 0) 
        {
          this.destinationCatalog = null;
          this.destinationIsProtected = false;
        }
        else
        {
          this.destinationCatalog = this.writeableCatalogs[i];
          this.destinationIsProtected = this.destinationCatalog instanceof StandardCatalogProtected;
        }

        setTimeout(()=>{
            this.destinationCatalogIdEvent.emit(this.destinationCatalogId);
            this.destinationCatalogEvent.emit(this.destinationCatalog);    
        }, 0)
    }
    
}

@Component({
    selector: '[catalogActionsDropdown]',
    templateUrl: "../templates/catalog.actions.component.html"
  })
export class CatalogActionsDropdownComponent {
    @Input('catalogActionsDropdown') element: any;
}

@Component({
    selector: '[showFirstError]',
    template: `{{ getErrorMessage() }}`
  })
  export class ShowFirstErrorComponent {
    @Input('showFirstError') formControl: FormControl;
    constructor() { 
    }
    getErrorMessage(): string{
      var errorKeys = Object.keys(this.formControl.errors||{});
      if(errorKeys.length <= 0) return "";
      var firstErrorKey = errorKeys[0];
      switch(firstErrorKey)
      {
         case "required": return "This field is required.";
         case "email": return "The specified email address is invalid.";
         default:
           return "error: "+firstErrorKey;
      }
    }
}

@Directive({
    selector: '[clickNoPropagate]'
})
export class ClickNoPropagateDirective {

    @Output() clickNoPropagate = new EventEmitter();
    
    @HostListener('click', ['$event']) onClick($event){
        this.clickNoPropagate.emit();
        return false;
    }


}

@Directive({
    selector: '[confirmAction]'
})
export class ConfirmActionDirective {

    @Output() confirmAction = new EventEmitter();
    @Input() confirmMessage: string = "foobar";

    constructor(private modalService: ModalService)
    {        
    }
    
    @HostListener('click', ['$event']) onClick($event){
        this.modalService.openConfirmForm("Confirmation", this.confirmMessage)
        .then(b=>{
            if(!b) return;
            this.confirmAction.emit();
        })
        return false;
    }


}

@Component({
  templateUrl: '../templates/filters.help.component.html',
})
export class FiltersHelpComponent  {

}

