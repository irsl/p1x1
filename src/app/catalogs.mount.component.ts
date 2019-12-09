import { Component, TemplateRef, OnDestroy, OnInit, ViewChild, ViewChildren, QueryList, AfterViewInit, Input } from '@angular/core';
import { S3Connection } from './s3';
import { WorldService, ConnectionsInfo, ConnectionInfo, MasterKeyInfo } from './world.service';
import { Router } from '@angular/router';
import { ModalService } from './modal.service';
import { FormBuilderService, FormManager } from './formbuilder.service';

@Component({
    templateUrl: '../templates/catalogs.mount.component.html',
})
export class CatalogsMountComponent  {
    s3 : FormManager<S3Connection>;

    constructor(private router: Router, private formBuilderService: FormBuilderService, private worldService: WorldService, private modalService: ModalService)
    {
        this.resetForm();
    }

    resetForm(){
        this.s3 = this.formBuilderService.BuildForm(S3Connection, async (s3conn: S3Connection)=>{
            var eventCallbackManager = this.modalService.openEventCallbackForm("Mounting new catalog", true);
            var b = await this.worldService.mountNewStandardCatalog(s3conn, eventCallbackManager.callback, true, true);
            eventCallbackManager.autoCloseUnlessWarnings();
            if(b == null) return;
            
            // all good! could reset the form (this.resetForm()) but we are navitating away anyway
            this.router.navigate(["/catalog/display", s3conn.getUniqueId()]);
    
        });
    }

}
