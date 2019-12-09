import { Component, OnInit } from '@angular/core';
import { FormManager, FormBuilderService } from './formbuilder.service';
import { Router, ActivatedRoute } from '@angular/router';
import { Validate } from './formbuilder.common';
import { Validators } from '@angular/forms';
import { CatalogService, ICatalog, StandardCatalog, StandardCatalogProtected } from './catalog.service';
import { ModalService } from './modal.service';
import { EventCallback } from './catalog.common';

class BaseSubcatalogForm {
    @Validate([Validators.required])
    public subdir: string;
}

class PasswordProtectedSubcatalogForm {
    @Validate([Validators.required])
    public subdir: string;

    @Validate([Validators.required])
    public password: string = "";
    @Validate([Validators.required])
    public comment: string = "";
}

@Component({
    templateUrl: '../templates/subcatalog.create.component.html',
})
export class SubCatalogCreateComponent implements OnInit {
    createClearText : FormManager<BaseSubcatalogForm>;
    createPasswordProtected : FormManager<PasswordProtectedSubcatalogForm>;
    createKeyDervived : FormManager<BaseSubcatalogForm>;

    destinationCatalogId: string;
    destinationCatalog: ICatalog;

    
    creationType: string;

    constructor(
        private router: Router, 
        private formBuilderService: FormBuilderService,
        private route: ActivatedRoute,    
        private catalogService: CatalogService,   
        private modalService: ModalService, 

    )
    {
        this.resetForms();
    }

    ngOnInit() {

        var params = this.route.snapshot.params;
        this.creationType = params["type"];

    }

    resetForms(){

        this.createClearText = this.formBuilderService.BuildForm(BaseSubcatalogForm, (form: BaseSubcatalogForm)=>{

            common("Creating a new cleartext catalog", (callback: EventCallback): Promise<ICatalog> => {
                return this.catalogService.CreateClearSubCatalog(this.destinationCatalog as StandardCatalog, form.subdir, callback);
            });
    
        });

        this.createPasswordProtected = this.formBuilderService.BuildForm(PasswordProtectedSubcatalogForm, (form: PasswordProtectedSubcatalogForm)=>{
            
            common("Creating a new password protected catalog", (callback: EventCallback): Promise<ICatalog> => {
                return this.catalogService.CreateProtectedSubCatalog(this.destinationCatalog as StandardCatalog, form.subdir, form.password, form.comment, callback);
            });
    
        });

        this.createKeyDervived = this.formBuilderService.BuildForm(BaseSubcatalogForm, (form: BaseSubcatalogForm)=>{
            
            common("Creating a new key derived catalog", (callback: EventCallback): Promise<ICatalog> => {
                return this.catalogService.CreateKeyDerivedSubCatalog(this.destinationCatalog as StandardCatalogProtected, form.subdir, callback);
            });

        });

        var me = this;

        async function common(title: string, realDeal: (callback: EventCallback)=> Promise<ICatalog>)
        {
            var eventCallbackManager = me.modalService.openEventCallbackForm(title, true);
            
            var cat = await realDeal(eventCallbackManager.callback);

            eventCallbackManager.dismissUnlessWarnings();
            if(!eventCallbackManager.errors)
               redirect(cat);
        }

        function redirect(cat: ICatalog){
            me.router.navigate(["/catalog/display", cat.getUniqueId()]);
        }

    }
}
