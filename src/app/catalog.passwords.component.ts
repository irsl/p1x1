import { Component, TemplateRef, OnDestroy, OnInit, ViewChild, ViewChildren, QueryList, AfterViewInit, Input } from '@angular/core';
import { WorldService, ConnectionsInfo, ConnectionInfo, MasterKeyInfo, ICatalogRoute } from './world.service';
import { Router, Params, ActivatedRoute } from '@angular/router';
import { ModalService } from './modal.service';
import { FormBuilderService, FormManager } from './formbuilder.service';
import { Validate } from './formbuilder.common';
import { Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { CatalogService, StandardCatalogProtected } from './catalog.service';
import { CatalogWrappedMasterKey } from './crypto';
import { EventSeverity } from './catalog.common';

class AddPwForm {
    @Validate([Validators.required])
    password: string;

    @Validate([Validators.required])
    comment: string;
}

@Component({
    templateUrl: '../templates/catalog.passwords.component.html',
})
export class CatalogPasswordsComponent  {
    addPw : FormManager<AddPwForm>;
    catalogRoute: ICatalogRoute;
    datasource : MatTableDataSource<CatalogWrappedMasterKey>;
    columns = ["comment", "actions"];

    currentCatalog: StandardCatalogProtected;

    constructor(
        private catalogService: CatalogService, 
        private world: WorldService, 
        private route: ActivatedRoute,
        private formBuilderService: FormBuilderService, 
        private modalService: ModalService
    )
    {
        this.resetForm();
    }

    ngOnInit(){
        this.regenerate(this.route.snapshot.params);
        this.route.params.subscribe((params)=>{
          this.regenerate(params);
        });

        this.world.openRootCatalog.subscribe(()=>{
            this.rerender();
        });
    }
    regenerate(params: Params) {
        this.catalogRoute = this.world.rememberRoute(params);
        this.rerender();
    }

    rerender(){   
        var cc = this.world.getCurrentCatalog();
        if(!(cc instanceof StandardCatalogProtected)) return;

        this.currentCatalog = cc as StandardCatalogProtected;
        if(!(this.currentCatalog instanceof StandardCatalogProtected)) return;
        var p = this.currentCatalog as StandardCatalogProtected;
        var cbl = p.getPasswordBlock();

        this.datasource = new MatTableDataSource<CatalogWrappedMasterKey>(cbl.WrappedMasterKeys);
    }
    

    async removePassword(pw: CatalogWrappedMasterKey){
        var me = this;
        var eventCallbackManager = me.modalService.openEventCallbackForm("Removing password from the catalog", true);
        try{
            await this.currentCatalog.delPassword(pw, eventCallbackManager.callback);
            await this.currentCatalog.saveIndex(eventCallbackManager.callback);
            eventCallbackManager.dismissUnlessWarnings();

            me.rerender();
        }catch(e){
            eventCallbackManager.callback(EventSeverity.Error, e);
        }
    }

    resetForm(){
        var me = this;
        this.addPw = this.formBuilderService.BuildForm(AddPwForm, async (pwform: AddPwForm)=>{
            var eventCallbackManager = me.modalService.openEventCallbackForm("Assigning new password to the catalog", true);
            try{
                await this.currentCatalog.addPassword(pwform.password, pwform.comment, eventCallbackManager.callback);
                await this.currentCatalog.saveIndex(eventCallbackManager.callback);
                eventCallbackManager.dismissUnlessWarnings();
                   
                me.rerender();
                me.addPw.form.reset();
                me.addPw.form.markAsUntouched();
            }catch(e){
                eventCallbackManager.callback(EventSeverity.Error, e);
            }
        });
    }

}
