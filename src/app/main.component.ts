import { Component, OnInit, Input  } from '@angular/core';

import { DynamicScriptLoaderService } from './dynamicscriptloader.service';
import { WorldService, ICatalogRoute } from './world.service';
import { NameOfCombinedCatalogRoot } from './catalog.service';

const DefaultSearchPlaceholder = "Search for...";

@Component({
  selector: 'my-app',
  templateUrl: '../templates/main.component.html',
})
export class AppComponent implements OnInit {
  searchPhrase: string = "";
  cp: ICatalogRoute;

  searchPlaceholder: string = DefaultSearchPlaceholder;

  rootCatalogName: string = NameOfCombinedCatalogRoot;
  world: WorldService;

  constructor(
    private dynamicScriptLoader: DynamicScriptLoaderService, 
    world: WorldService,
  ) 
  {
    this.world = world;
  }

  ngOnInit() {
    // note: we need to load this script after this view has been initalized as it depends on some static css selectors
    // and the nodes need to be already present at the time when this js is loaded
    this.loadScripts();

    // this is a service, so it is not initialized
    this.world.ngOnInit();
    
    this.cp = this.world.getRouteCatalog();
    this.searchPhrase = this.cp.searchPhrase;
    this.setSearchPlaceholder();

    this.world.catalogRoute.subscribe(cp=>{
      this.cp = cp;      

      // note: angular complains otherwise that this field is changed from a child view
      setTimeout(() => {         
         this.searchPhrase = cp.searchPhrase;
         this.setSearchPlaceholder();
      });
    })

  }

  setSearchPlaceholder(){
    this.searchPlaceholder = this.cp.currentlySelectedCatalogId ? "Search in "+this.cp.currentlySelectedCatalogId : DefaultSearchPlaceholder;
  }

  search(jumpToRoot: boolean = false){
     this.world.navigateToSearch(this.searchPhrase, jumpToRoot)
  }
  clearSearch(){
    this.searchPhrase  = "";
    this.search(true);
  }
 
  private loadScripts() {
    this.dynamicScriptLoader.load('sb-admin-2');
  }

}
