//https://medium.com/@oojhaajay/rxweb-good-way-to-show-the-error-messages-in-angular-reactive-forms-c27429f51278

import { Injectable, Component, Output, EventEmitter } from '@angular/core';
import { NgbModal, NgbModalRef, NgbModalConfig, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { EventCallback, EventSeverity, StringKeyValuePairs, TagKeyValuePairs } from './catalog.common';
import { interval } from 'rxjs';
import { MasterKey, Crypto } from './crypto';
import { S3Connection } from './s3';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { FormBuilderService, FormManager } from './formbuilder.service';
import { Validate } from './formbuilder.common';
import { Helper } from './helper';
import { PixiValidators } from './pixivalidators';
import { SafeUrl } from '@angular/platform-browser';
import { ICatalog } from './catalog.service';

interface Event {
    severity: EventSeverity;
    event: string;
}

export interface SaveMasterKeyResult {
    save: boolean,
    comment?: string,
}

@Component({
    template: `
    <div class="modal-header">
    <h4 class="modal-title">Unexpected error</h4>
    <button type="button" class="close" aria-label="Close" (click)="modal.dismiss(false)">
      <span aria-hidden="true">&times;</span>
    </button>
  </div>
  <div class="modal-body console-like">
    {{errorMessage}}
  </div>
  <div class="modal-footer">
    <button type="button" class="btn btn-light" (click)="modal.close(false)">OK</button>
  </div>
    `
})
export class ErrorPromptComponent  {
    modal: NgbModalRef;
    errorMessage: string;
}

@Component({
    template: `
    <div class="modal-header">
    <h4 class="modal-title">{{filename}}</h4>
    <button type="button" class="close" aria-label="Close" (click)="modal.close(false)">
      <span aria-hidden="true">&times;</span>
    </button>
  </div>
  <div class="modal-body text-center">
    <video controls autoplay>
       <source [src]="videoUrl" [type]="contentType" />
    </video>
  </div>
  <div class="modal-footer">
    <button type="button" class="btn btn-light" (click)="modal.close(false)">Close</button>
  </div>
    `
})
export class VideoPlayerComponent  {
    modal: NgbModalRef;
    filename: string;
    contentType: string;
    videoUrl: string;
}

@Component({
    template: `
    <div class="modal-header">
    <h4 class="modal-title">Share result</h4>
    <button type="button" class="close" aria-label="Close" (click)="modal.close(false)">
      <span aria-hidden="true">&times;</span>
    </button>
  </div>
  <div class="modal-body text-center">
    <div>The selected files have been shared successfully and the files are now accessible until they expired according to the settings. You may share the following URL with the intended recipients:</div>
    <div class="margin-top">
        <div class="input-group mb-3">
           <input #userinput type="text" class="form-control" [(ngModel)]="url" readonly>
           <div class="input-group-append">
             <button class='btn btn-outline-secondary' (click)="copyToClipboard(userinput)">Copy to clipboard</button>
           </div>
        </div>
    </div>
  </div>
  <div class="modal-footer">
    <button type="button" class="btn btn-light" (click)="modal.close(false)">Close</button>
  </div>
    `
})
export class ShowShareResultComponent  {
    modal: NgbModalRef;
    url: string;

        /* To copy Text from Textbox */
  copyToClipboard(inputElement){
    inputElement.select();
    document.execCommand('copy');
    inputElement.setSelectionRange(0, 0);
  }
}

export class ShareFormExpiration {
    @Validate([Validators.required])
    public days: number = 7;

    @Validate([Validators.required])
    public hours: number = 0;

    @Validate([Validators.required])
    public minutes: number = 0;

    @Validate([Validators.required])
    public seconds: number = 0;

    
    public toTotalSeconds(): number {
        return this.days*86400+this.hours*3600+this.minutes*60+this.seconds;
    }
}
export class ClearShareForm {
    @Validate([Validators.required, PixiValidators.NoIndex])
    public shareName: string;

    @Validate([], {group: ShareFormExpiration})
    public expiration: ShareFormExpiration;
}
@Component({
    templateUrl: '../templates/modal.clearshareform.component.html'
})
export class ClearShareFormComponent  {
    clearForm : FormManager<ClearShareForm>;

    modal: NgbModalRef;
    url: string;

    constructor(private formBuilderService: FormBuilderService,)
    {
        var me = this;
        this.clearForm = this.formBuilderService.BuildForm(ClearShareForm, (value)=>{
             me.modal.close(value);
        });
    }

}

export class ProtectedShareForm extends ClearShareForm {
    @Validate([])
    public generateRandomPassword: boolean = false;

    @Validate([Validators.required])
    public password: string;

    @Validate([Validators.required])
    public comment: string;
}
@Component({
    templateUrl: '../templates/modal.protectedshareform.component.html'
})
export class ProtectedShareFormComponent  {
    protectedForm : FormManager<ProtectedShareForm>;

    modal: NgbModalRef;
    url: string;

    generateRandomPassword: boolean = false;

    constructor(private formBuilderService: FormBuilderService,)
    {
        var me = this;
        this.protectedForm = this.formBuilderService.BuildForm(ProtectedShareForm, (value)=>{
             me.modal.close(value);
        });

    }

    async randomChange(){
        this.generateRandomPassword = this.protectedForm.form.get("generateRandomPassword").value;
        if(this.generateRandomPassword)
        {
            var randomPassword = await Crypto.GenerateRandomPassword();
            this.protectedForm.form.get("comment").setValue("Random generated password");
            this.protectedForm.form.get("password").setValue(randomPassword);    
        }
        else
        {
            this.protectedForm.form.get("comment").setValue("");
            this.protectedForm.form.get("password").setValue("");    
        }
    }

}

@Component({
    template: `
    <div class="modal-header">
    <h4 class="modal-title">Tag editor</h4>
    <button type="button" class="close" aria-label="Close" (click)="modal.close(false)">
      <span aria-hidden="true">&times;</span>
    </button>
  </div>
  <div class="modal-body">
     <tag-editor [tags]="tags" [protectedTags]="protectedTags" [allTagKeys]="allTagKeys" [imageUrl]="imageUrl"></tag-editor>
  </div>
  <div class="modal-footer">
    <button type="button" class="btn btn-success" (click)="modal.close(true)">OK</button>
    <button type="button" class="btn btn-danger" (click)="modal.close(false)">Cancel</button>
  </div>
    `
})
export class EmbeddedTagEditorComponent  {
    modal: NgbModalRef;
    tags: StringKeyValuePairs;
    protectedTags: TagKeyValuePairs;
    allTagKeys: string[];
    imageUrl: SafeUrl|string;
}

@Component({
    template: `
    <div class="modal-header">
    <h4 class="modal-title">{{title}}</h4>
    <button type="button" class="close" aria-label="Close" (click)="modal.dismiss(false)">
      <span aria-hidden="true">&times;</span>
    </button>
  </div>
  <div class="modal-body">
    {{question}}
  </div>
  <div class="modal-footer">
    <button type="button" class="btn btn-success" (click)="modal.close(true)">OK</button>
    <button type="button" class="btn btn-light" (click)="modal.close(false)">Cancel</button>
  </div>
    `
})
export class OkCancelComponent  {
    title: string;
    question: string;
    modal: NgbModalRef;
}

@Component({
    templateUrl: "../templates/modal.eventcallback.component.html"
})
export class EventCallbackComponent  {
    title: string;
    closeButtonText = "Close";
    modal: NgbModalRef;
    eventsArray : Event[] = [];
    progressMode: boolean = false;
    filesSoFar: number = 0;
    sumFiles: number = 0;
    sizeSoFar: number = 0;
    sizeSoFarStr: string= "0";

    sumSize: number = 0;
    sumSizeStr: string= "0";

    @Output() onStopCounter = new EventEmitter();

    stopCounter(){
        this.onStopCounter.emit();
    }    
}

class MasterKeyForm {
    @Validate([Validators.required])
    masterKey: string;
}
class PasswordForm {
    @Validate([Validators.required])
    password: string;
}
@Component({
    templateUrl: '../templates/modal.passwordcallback.component.html'
})
export class PasswordCallbackComponent  {
    catalogId: string;
    passwordFailed: boolean;
    modal: NgbModalRef;
    passwordMode: boolean = true;
    disableMasterKeyMode: boolean = false;

    password: FormManager<PasswordForm>;
    master: FormManager<MasterKeyForm>;

    constructor(private formBuilderService: FormBuilderService)
    {
        var me = this;

        this.master = this.formBuilderService.BuildForm(MasterKeyForm, justClose);
        this.password = this.formBuilderService.BuildForm(PasswordForm, justClose);

        function justClose() {
            return me.modal.close(true);
        }
    }

    close(result: boolean){
        this.modal.close(result);
    }

    toggle() {
        this.passwordMode=!this.passwordMode;
        return false;
    }
}


@Component({
    templateUrl: '../templates/modal.showmasterkey.component.html'
})
export class ShowMasterKeyComponent  {
    modal: NgbModalRef;
    catalogId: string;
    keyAsJson: string;
    comment: string;
    offerSave: boolean;

    close(b: boolean){
        this.modal.close(b);
    }
}



export class CreateNewClearCatalogForm
{
    // catalog.CreateStandardCatalog expects an empty string to create an unprotected catalog, so we deliver it this way
    public password: string = "";
    public comment: string = "";
}
export class CreateNewProtectedCatalogForm
{
    @Validate([Validators.required])
    public password: string;
    @Validate([Validators.required])
    public comment: string;
}

@Component({
    templateUrl: '../templates/modal.catalogchooser.component.html'
})
export class CatalogChooserComponent {

    modal: NgbModalRef;

    selectedCatalog: string = null;
    catalogs: ICatalog[]
    title: string;

    doReturn(){
        for(let q of this.catalogs)
        {
            if(q.getUniqueId() == this.selectedCatalog)
               return this.modal.close(q);
        }
    }
}

@Component({
    templateUrl: '../templates/modal.createnewstandardcatalog.component.html'
})
export class CreateNewStandardCatalogComponent  {
    catalogId: string;
    modal: NgbModalRef;

    protectedForm : FormManager<CreateNewProtectedCatalogForm>;
    clearForm : FormManager<CreateNewClearCatalogForm>;

    passwordProtected: boolean = true;

    constructor(private formBuilderService: FormBuilderService,)
    {
        var me = this;
        this.protectedForm = this.formBuilderService.BuildForm(CreateNewProtectedCatalogForm, resolve);        
        this.clearForm = this.formBuilderService.BuildForm(CreateNewClearCatalogForm, resolve);        

        function resolve(form){
            me.modal.close(form);
        }
    }

    callSubmit(){
        if(this.passwordProtected)
           this.protectedForm.onSubmit();
        else
           this.clearForm.onSubmit();
    }

    escape()
    {
        this.modal.close(null);
    }
}

const defaultOpenParameters = {
    centered: true,
    scrollable: true,
}

export interface IEventCallbackManager {
    callback: EventCallback;
    errors: boolean;
    dontCloseAutomatically: boolean;
    dismissUnlessWarnings();
    dismiss();
    autoCloseUnlessWarnings();
    showProgressBar(sumFiles: number, sumSize: number);
    increaseProgress(size: number);
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {
    constructor(private modalService: NgbModal, config: NgbModalConfig)
    {        
        config.backdrop = 'static';
        config.keyboard = false;
    }

    async openCreateNewStandardCatalogForm(conn: S3Connection): Promise<CreateNewClearCatalogForm|CreateNewProtectedCatalogForm> {
        var modalService = this.modalService;
        var modalRef = modalService.open(CreateNewStandardCatalogComponent,  defaultOpenParameters);
        var comp = (modalRef.componentInstance as CreateNewStandardCatalogComponent)
        comp.catalogId = conn ? conn.getUniqueId() : "unknown";
        comp.modal = modalRef;

        return await modalRef.result;
    }

    async showCatalogChooser(title: string, catalogs: ICatalog[]): Promise<ICatalog> {
        var modalService = this.modalService;
        var modalRef = modalService.open(CatalogChooserComponent,  defaultOpenParameters);
        var comp = (modalRef.componentInstance as CatalogChooserComponent)
        comp.catalogs = catalogs;
        comp.title = title;
        comp.modal = modalRef;

        return await modalRef.result;        
    }
    
    openEventCallbackForm(title: string, openImmediately: boolean) : IEventCallbackManager
    {
        var eventsArray : Event[] = [];

        var opened = false;
        var counter = 0;
        var modalRef;
        var comp : EventCallbackComponent;
        var openSubscription = null;
        var countBackSubscription;

        var modalService = this.modalService;

        var rep : IEventCallbackManager;

        if(openImmediately)
           openModal();
        else
           autoOpen();

        var callback = function(severity: EventSeverity, event: string)
        {
            if(severity == EventSeverity.Begin)
            {
                counter++;
            }
            else if(severity == EventSeverity.End)
            {
                counter--;
                if(counter <= 0)
                {
                    if((!rep.errors)&&(!rep.dontCloseAutomatically))
                    {
                        autoClose();
                    }
                }
            }
            else
            {
                if(severity != EventSeverity.Info)
                {
                    rep.errors = true;
                    openModal();
                 }

                eventsArray.push({severity: severity, event: event});
            }
        }

        rep = {
            callback: callback,
            dontCloseAutomatically: false,
            errors: false,
            dismiss: doClose,
            dismissUnlessWarnings: function(){
                if(!rep.errors){
                    doClose();
                }
            },
            autoCloseUnlessWarnings: function() {
                if(!rep["errors"]){
                    autoClose();
                }
            },
            showProgressBar: function(sumFiles: number, sumSize: number){
                comp.progressMode = true;
                comp.sumFiles = sumFiles;
                comp.sumSize = sumSize;
                comp.sumSizeStr = Helper.humanFileSize(comp.sumSize);
            },
            increaseProgress: function(size: number){
                comp.filesSoFar++;
                comp.sizeSoFar+= size;
                comp.sizeSoFarStr = Helper.humanFileSize(comp.sizeSoFar);
            },

        };        

        return rep;

        function autoOpen(){
            const secondsCounter = interval(3000);
            openSubscription = secondsCounter.subscribe(n =>{
                console.log("autoopen just fired");
                openModal();
            });
        }

        function autoClose()
        {
            console.log("autoClose");

            if(!opened)
            {
                cancelOpen();
                return;
            }
            const seconds = 10;
            countBackSubscription = interval(1000).subscribe(n => {
                if(countBackSubscription == null) return; // has been cancelled
                if(n == 10)
                {
                    countBackSubscription.unsubscribe();
                    countBackSubscription = null;
                    doClose();
                    return;
                }
                comp.closeButtonText = "Closing in "+ (seconds - n)+" seconds";
            });            
        }

        function doClose(){
            console.log("doClose");
            cancelOpen();
            if(modalRef) modalRef.dismiss();
        }

        function openModal(){
            console.log("openModal", opened);
            if(opened) return;
            opened = true;
            cancelOpen();
            modalRef = modalService.open(EventCallbackComponent,  defaultOpenParameters);
            comp = (modalRef.componentInstance as EventCallbackComponent)
            comp.title = title;
            comp.modal = modalRef;
            comp.eventsArray = eventsArray;
            comp.onStopCounter.subscribe(()=>{
                comp.closeButtonText = "Close";
                if(countBackSubscription != null) {
                    countBackSubscription.unsubscribe();
                    countBackSubscription = null;
                }
            })
            return modalRef;    
        }
        function cancelOpen(){
            console.log("cancelOpen");

            if(openSubscription) openSubscription.unsubscribe();
            openSubscription = null;
        }
    }

    openConfirmForm(title: string, question: string) : Promise<boolean>
    {
        var modalService = this.modalService;
        var modalRef = modalService.open(OkCancelComponent,  defaultOpenParameters);
        var comp = (modalRef.componentInstance as OkCancelComponent)
        comp.title = title;
        comp.question = question;             
        comp.modal = modalRef;
        return modalRef.result.catch(x=>{
            return false;
        })
    }

    showErrorPrompt(errorMessage: string)
    {
        var modalService = this.modalService;
        var modalRef = modalService.open(ErrorPromptComponent,  defaultOpenParameters);
        var comp = (modalRef.componentInstance as ErrorPromptComponent)
        comp.modal = modalRef;
        comp.errorMessage = errorMessage;
        return modalRef.result.catch(x=>{});
    }

    async showMasterKeyDialog(connectionId: string, key: JsonWebKey, offerSave: boolean): Promise<SaveMasterKeyResult>
    {
        var modalService = this.modalService;
        var modalRef = modalService.open(ShowMasterKeyComponent, defaultOpenParameters);
        var comp = (modalRef.componentInstance as ShowMasterKeyComponent)
        comp.modal = modalRef;
        comp.catalogId = connectionId;
        comp.keyAsJson = JSON.stringify(key, null, 3);
        comp.offerSave = offerSave;
        var b = await modalRef.result;
        if(!b) return { save: false };
        return {
            save: true,
            comment: comp.comment,
        }
    }

    async openPresharedPasswordForm(url: string, passwordFailed: boolean) : Promise<string>
    {
        var mainService = this;
        var modalService = this.modalService;

        var modalRef = modalService.open(PasswordCallbackComponent,  defaultOpenParameters);
        var comp = (modalRef.componentInstance as PasswordCallbackComponent)
        comp.passwordFailed = passwordFailed;
        comp.catalogId = url;
        comp.modal = modalRef;
        comp.disableMasterKeyMode = true;

        var b = await modalRef.result;
        if(!b) 
            return null;
        
        console.log("password callback form just returned", b, comp)
        return comp.password.value.password;
    }

    async openPasswordForm(conn: S3Connection, passwordFailed: boolean) : Promise<string|MasterKey>
    {
        var mainService = this;
        var modalService = this.modalService;

        var modalRef = modalService.open(PasswordCallbackComponent,  defaultOpenParameters);
        var comp = (modalRef.componentInstance as PasswordCallbackComponent)
        comp.passwordFailed = passwordFailed;
        comp.catalogId = conn ? conn.getUniqueId() : "unknown";
        comp.modal = modalRef;

        var b = await modalRef.result;
        if(!b) 
            return null;
        
            console.log("password callback form just returned", b, comp)
        if(comp.passwordMode)
            return comp.password.value.password;

        try 
        {
            var jwk = JSON.parse(comp.master.value.masterKey);

            var masterKey = await Crypto.ImportMasterKey(jwk); 

            return masterKey;
        }
        catch(x){
            console.error("unexpected error during openPasswordForm", x);
            await mainService.showErrorPrompt(x.toString())
            return await mainService.openPasswordForm(conn, true);
        }
    }

    async showTagEditor(tags: StringKeyValuePairs, allTagKeys: string[], imageUrl: SafeUrl|string, protectedTags?: TagKeyValuePairs) : Promise<StringKeyValuePairs>
    {
        var tagsClone : StringKeyValuePairs = {...tags};
        var mainService = this;
        var modalService = this.modalService;

        var params = {...defaultOpenParameters};
        if(imageUrl) params["size"] = "xl";
        var modalRef = modalService.open(EmbeddedTagEditorComponent, params);
        var comp = (modalRef.componentInstance as EmbeddedTagEditorComponent)
        comp.imageUrl = imageUrl;
        comp.allTagKeys = allTagKeys;
        comp.tags = tagsClone;
        comp.protectedTags = protectedTags;
        comp.modal = modalRef;

        var b = await modalRef.result;
        if(!b) 
            return null;
        
        return tagsClone;
    }

    async showVideo(filename: string, contentType: string, videoUrl: string) : Promise<void>
    {
        var params : NgbModalOptions = {...defaultOpenParameters, size: "xl"};
        var modalRef = this.modalService.open(VideoPlayerComponent, params);
        var comp = (modalRef.componentInstance as VideoPlayerComponent)
        comp.contentType = contentType;
        comp.filename = filename;
        comp.videoUrl = videoUrl;
        comp.modal = modalRef;

        await modalRef.result;
    }

    async showShareResultPopup(url: string): Promise<void>
    {
        var params : NgbModalOptions = {...defaultOpenParameters, size: "xl"};
        var modalRef = this.modalService.open(ShowShareResultComponent, params);
        var comp = (modalRef.componentInstance as ShowShareResultComponent)
        comp.url = url;
        comp.modal = modalRef;

        await modalRef.result;
    }

    public showProtectedShareForm(url: string): Promise<ProtectedShareForm>
    {
        var modalRef = this.modalService.open(ProtectedShareFormComponent);
        var comp = (modalRef.componentInstance as ProtectedShareFormComponent)
        comp.url = url;
        comp.modal = modalRef;

        return modalRef.result;
    }

    public showClearShareForm(url: string): Promise<ClearShareForm>
    {
        var modalRef = this.modalService.open(ClearShareFormComponent);
        var comp = (modalRef.componentInstance as ClearShareFormComponent)
        comp.url = url;
        comp.modal = modalRef;

        return modalRef.result;
    }
}
