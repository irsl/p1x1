import { Injectable, OnInit, Inject, Output, EventEmitter } from '@angular/core';
import { S3Connection } from './s3';
import { LocalStorageService, AbstractLocalStorage } from './localstorage.service';
import { CatalogService, ICatalog, CombinedCatalog, NameOfCombinedCatalogRoot } from './catalog.service';
import { EventSeverity, EventCallback } from './catalog.common';
import { ModalService } from './modal.service';
import { Crypto, MasterKey } from './crypto';
import { E } from './error';
import { Helper } from './helper';
import { Params, Router } from '@angular/router';

class PixiConnectionSettings {
    public s3Connections: S3Connection[];
    static fromJSON(data: any): PixiUserSettings {
        for(var i = 0; i < data["s3Connections"].length; i++) {
            data["s3Connections"][i] = Helper.createRaw(S3Connection, data["s3Connections"][i]);
        }
        return Helper.create(PixiUserSettings, data);
    }
}
class PixiUserSettings {
}
class CachedMasterKeysSettings {
    public cachedMasterKeys: MasterKeyInfo[];
}

export interface MasterKeyInfo
{
    key: JsonWebKey;
    comment: string;
    connectionId: string;
}

export interface ConnectionInfo {
    rawConnection: S3Connection;
    masterKeys: MasterKeyInfo[];
    catalog: ICatalog;
}

export class ConnectionsInfo {
    connections: ConnectionInfo[];
    masterKeys: MasterKeyInfo[];
}

export interface ICatalogRoute 
{
    currentlySelectedCatalogId: string,
    searchPhrase: string,
}


const settingsKey = "pixi-user-settings";
const connectionsKey = "pixi-connections";
const cachedMasterKeysKey = "pixi-master-keys";

export const RootCatalogName = NameOfCombinedCatalogRoot;

class CompleteSettings {
    user: PixiUserSettings;
    connections: PixiConnectionSettings;
    cachedMasterKeys: CachedMasterKeysSettings;

    static fromJSON(data: any): CompleteSettings
    {        
        console.log("shit0", data)
        data["connections"] = PixiConnectionSettings.fromJSON(data["connections"]);
        console.log("shit", data)
        return data;        
    }
}

@Injectable({
  providedIn: 'root'
})
export class WorldService implements OnInit {
    private userSettings: PixiUserSettings;
    private connections: PixiConnectionSettings;
    public combinedCatalog: CombinedCatalog;
    private knownSecrets: string[] = [];
    private cachedMasterKeySettings: CachedMasterKeysSettings;
    private cachedMasterKeys: MasterKey[];
    private currentlySelectedCatalogId: string;
    public searchPhrase: string;


    @Output() openRootCatalog: EventEmitter<ICatalog> = new EventEmitter();
    @Output() closeRootCatalog: EventEmitter<ICatalog> = new EventEmitter();
    @Output() catalogRoute: EventEmitter<ICatalogRoute> = new EventEmitter();
    
    constructor(
        @Inject(LocalStorageService) private localStorage: AbstractLocalStorage, 
        private catalogService: CatalogService,
        private modalService: ModalService,
        private router: Router,
   
    ) 
    {
        this.combinedCatalog = catalogService.NewCombinedCatalog();
        this.userSettings = localStorage.get(PixiUserSettings, settingsKey);
        if(!this.userSettings)
           this.userSettings = Helper.create(PixiUserSettings, {});

        this.connections = localStorage.get(PixiConnectionSettings, connectionsKey);
        if(!this.connections)
            this.connections = Helper.create(PixiConnectionSettings, {s3Connections:[]});
        if(!this.connections.s3Connections)
            this.connections.s3Connections = [];
   
        this.cachedMasterKeySettings = localStorage.get(CachedMasterKeysSettings, cachedMasterKeysKey);
        if((!this.cachedMasterKeySettings)||(!this.cachedMasterKeySettings.cachedMasterKeys))
           this.cachedMasterKeySettings = Helper.create(CachedMasterKeysSettings, {cachedMasterKeys: []});
    }

    public exportSettings(): string
    {
        var re = Helper.createRaw(CompleteSettings, {
            user: this.userSettings,
            connections: this.connections,
            cachedMasterKeys: this.cachedMasterKeySettings,
        });
        return JSON.stringify(re, null, 3);
    }
    public async importSettings(str: string): Promise<void>
    {
        var re = Helper.createRawJson(CompleteSettings, str);
        this.connections = re.connections;
        this.userSettings = re.user;
        this.cachedMasterKeySettings = re.cachedMasterKeys;

        this.combinedCatalog = this.catalogService.NewCombinedCatalog();
        await this.ngOnInit();
    }
    public getCurrentCatalog(): ICatalog
    {
        if(!this.currentlySelectedCatalogId) return null;

        return this.currentlySelectedCatalogId == RootCatalogName ? 
          this.combinedCatalog : 
          this.combinedCatalog.getSubCatalogByIdRecursively(this.currentlySelectedCatalogId)
        ;  
    }

    public rememberRoute(params: Params) : ICatalogRoute
    {
        console.log("world.service rememberRoute", params)
        this.searchPhrase = params["search"];
        this.currentlySelectedCatalogId = params["catalogId"];
        var cp = this.getRouteCatalog();
        this.catalogRoute.emit(cp)
        return cp;
    }
    public getRouteCatalog() : ICatalogRoute
    {
        return {
            currentlySelectedCatalogId: this.currentlySelectedCatalogId || RootCatalogName,
            searchPhrase: this.searchPhrase || "",
        };
    }

    public getInfoAboutConnections(): ConnectionsInfo{
        var connections : ConnectionInfo[] = [];
        
        for(let rawConnection of this.connections.s3Connections) {
            var id = rawConnection.getUniqueId();
            var catalog = this.combinedCatalog.getSubCatalogById(id);
            var masterKeys : MasterKeyInfo[] = [];
            for(let mk of this.cachedMasterKeySettings.cachedMasterKeys) {
                if(mk.connectionId != id) continue;

                masterKeys.push(mk);
            }

            var c : ConnectionInfo = {
                rawConnection: rawConnection,
                catalog: catalog,
                masterKeys: masterKeys,
            };
            connections.push(c);
        }

        return Helper.create(ConnectionsInfo, {
            connections: connections,
            masterKeys: this.cachedMasterKeySettings.cachedMasterKeys,
        });
    }
    public async removeMasterKeyAndSaveSettings(mk: MasterKeyInfo): Promise<void> {
        if(Helper.deleteArrayValue(this.cachedMasterKeySettings.cachedMasterKeys, mk))
        {
            this.saveMasterKeySettings();
            await this.initMasterKeys();
        }
    }

    public removeConnectionAndSaveSettings(conn: S3Connection) {
        if(Helper.deleteArrayValue(this.connections.s3Connections, conn))
        {
            this.saveConnections();
        }
    }

    private async initMasterKeys()
    {
        this.cachedMasterKeys = [];
        for(let q of this.cachedMasterKeySettings.cachedMasterKeys) {
            this.cachedMasterKeys.push(await Crypto.ImportMasterKey(q.key));
        }
    }

    async ngOnInit() {
        await this.initMasterKeys();

        if(this.connections.s3Connections.length <= 0) return;

        var eventCallbackManager = this.modalService.openEventCallbackForm("Mounting saved catalogs", true);
        eventCallbackManager.dontCloseAutomatically = true;

        for(let s3conn of this.connections.s3Connections)
        {
            await this.mountNewStandardCatalog(s3conn, eventCallbackManager.callback, false, false);
        }

        eventCallbackManager.callback(EventSeverity.Info, "Mounting catalogs has completed");

        eventCallbackManager.autoCloseUnlessWarnings();

    }
    public areAnyCatalogsAdded(): boolean
    {
        return this.connections.s3Connections.length > 0;
    }

    public async mountPresignedCatalog(presignedUrl: string, password: string)
    {
        var passwordTried = false;
        var me = this;

        var cat = this.combinedCatalog.getSubCatalogById(presignedUrl);
        if(cat)
        {
            // wow. this presigned catalog is already mounted. lets jump to it.
            
            jumpToCat();
            return;
        }
  
        var numberOfTries = 0;
        var eventManager = this.modalService.openEventCallbackForm("Opening preshared catalog", true)
        try{
            cat = await this.catalogService.OpenSharedCatalog(presignedUrl, async (url)=>{
                numberOfTries++;
                if((password)&&(!passwordTried)) 
                {
                    passwordTried = true;
                    return password;
                }
      
                return me.modalService.openPresharedPasswordForm(presignedUrl, numberOfTries > 1);
            }, eventManager.callback)
            eventManager.autoCloseUnlessWarnings();
    
            this.combinedCatalog.AddSubCatalog(cat);
            jumpToCat();
        }catch(e){
            eventManager.callback(EventSeverity.Error, e.toString());
        }


        function jumpToCat(){
            me.router.navigate(["/catalog/display", presignedUrl]);
        }

    }
    public async mountNewStandardCatalog(s3Conn: S3Connection, eventCallback: EventCallback, offerCreateAsAnOption: boolean = true, saveToSettings: boolean = true): Promise<ICatalog>
    {
        var catalog;
        var modalService = this.modalService;
        var lastPasswordPopup;
        var lastMasterKey = 0;
        var world = this;
        try{
            catalog = await this.catalogService.OpenStandardCatalog(s3Conn, this.knownSecrets, function(conn: S3Connection){
                if(lastMasterKey < world.cachedMasterKeys.length) {
                    // there are some master keys to try
                    return Promise.resolve(world.cachedMasterKeys[lastMasterKey++]);
                }
                var passwordFailed = (lastPasswordPopup == s3Conn);
                lastPasswordPopup = s3Conn;
                return modalService.openPasswordForm(conn, passwordFailed);
            }, eventCallback);
        }catch(e){
            console.log("error opening catalog", e)
            if((e.errorCode == E.CatalogEmptyError)&&(offerCreateAsAnOption))
            {
                var b = await this.modalService.openCreateNewStandardCatalogForm(s3Conn);
                console.log("openCreateNewStandardCatalogForm just returned", b);
                if(b == null) return null; // nothing to create

                catalog = await this.catalogService.CreateStandardCatalog(s3Conn, b.password, b.comment, eventCallback);
            }
            else
            {
                eventCallback(EventSeverity.Error, "Error mounting "+s3Conn.getUniqueId()+":\n\n"+ e.toString());
                return null;
            }
        }

        if(saveToSettings)
        {
            this.connections.s3Connections.push(s3Conn);
            this.saveConnections();    
        }

        this.combinedCatalog.AddSubCatalog(catalog);

        this.openRootCatalog.emit(catalog);
        return catalog;
    }
    public closeCatalog(catalog: ICatalog)
    {
        this.combinedCatalog.RemoveSubCatalog(catalog);
        this.closeRootCatalog.emit(catalog);
    }

    private saveUserSettings()
    {
        this.localStorage.set(settingsKey, this.userSettings);
    }
    private saveConnections()
    {
        this.localStorage.set(connectionsKey, this.connections);
    }

    private saveMasterKeySettings()
    {
        this.localStorage.set(cachedMasterKeysKey, this.cachedMasterKeySettings);
    }
    public saveSettings()
    {
        this.saveUserSettings();
        this.saveConnections();
        this.saveMasterKeySettings();
    }
    public async rememberMasterKey(conn: S3Connection, jwk: JsonWebKey, comment: string): Promise<void> {
        var m : MasterKeyInfo = {
            connectionId: conn.getUniqueId(),
            comment: comment,
            key: jwk,
        };     
        this.cachedMasterKeySettings.cachedMasterKeys.push(m);
        this.saveMasterKeySettings();
        return this.initMasterKeys();
    }

    public navigateToSearch(newSearchPhrase: string, jumpToRoot: boolean = false)
    {
        this.searchPhrase = newSearchPhrase;
        if((jumpToRoot)||(!this.currentlySelectedCatalogId))
           this.currentlySelectedCatalogId = RootCatalogName;
        var navi = ["/catalog/display", this.currentlySelectedCatalogId, this.searchPhrase];
        console.log("navigating to", navi)
        this.router.navigate(navi);    
    }

}
