import { Component, TemplateRef, OnDestroy, OnInit, ViewChild, ViewChildren, QueryList, AfterViewInit, Input } from '@angular/core';
import { WorldService, ConnectionsInfo, ConnectionInfo, MasterKeyInfo } from './world.service';
import { ModalService } from './modal.service';
import { Crypto } from './crypto';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { CatalogCapability, StandardCatalogProtected } from './catalog.service';
import { MatSort } from '@angular/material/sort';


interface ConnectionInfoSimple {
    original: ConnectionInfo,
    catalogId: string,
    mounted: string,
    cached: number,
}

@Component({
    templateUrl: '../templates/catalogs.manage.component.html',
})
export class CatalogsManageComponent implements OnDestroy, OnInit, AfterViewInit  {
    catalogsInfo : ConnectionsInfo;

    connectionsColumns: string[] = ['catalogId', 'mounted', 'cached', 'actionsCatalogs'];
    connectionsDatasource : MatTableDataSource<ConnectionInfoSimple>;

    masterKeysColumns: string[] = ['connectionId', 'comment', 'actionsMasterKeys'];
    masterKeysDatasource : MatTableDataSource<MasterKeyInfo>;

    @ViewChild('connectionsPaginator', {static: true}) connectionsPaginator: MatPaginator;
    @ViewChild('masterKeysPaginator', {static: true}) masterKeysPaginator: MatPaginator;
    @ViewChildren(MatSort) sorters !: QueryList<MatSort>;

    constructor(private world: WorldService, private modalService: ModalService)
    {
    }

    applyConnectionsFilter(filterValue: string) {
        this.connectionsDatasource.filter = filterValue.trim().toLowerCase();
      }

      applyMasterKeysFilter(filterValue: string) {
        this.masterKeysDatasource.filter = filterValue.trim().toLowerCase();
      }
    async mount(con: ConnectionInfoSimple)
    {
        var eventCallbackManager = this.modalService.openEventCallbackForm("Mounting catalog", true);
        await this.world.mountNewStandardCatalog(con.original.rawConnection, eventCallbackManager.callback, true, false)
        eventCallbackManager.autoCloseUnlessWarnings();
    }

    async umount(con: ConnectionInfoSimple)
    {
        await this.world.closeCatalog(con.original.catalog);
    }

    async displayMasterKeyForConnection(con: ConnectionInfoSimple)
    {
        if(!this.isProtected(con)) return;
        var modal = this.modalService;
        var world = this.world;
        var pc = con.original.catalog as StandardCatalogProtected;
        var jwk = await Crypto.ExportMasterKey(pc.getMasterKey())
        var offerSave = con.original.masterKeys.length <= 0;
        var b = await modal.showMasterKeyDialog(con.original.rawConnection.getUniqueId(), jwk, offerSave);
        if(b.save)
        {
            world.rememberMasterKey(con.original.rawConnection, jwk, b.comment);
            this.refreshConnections();    
        }
    }
    async displayMasterKey(mk: MasterKeyInfo)
    {
        await this.modalService.showMasterKeyDialog(mk.connectionId, mk.key, false)
    }

    isProtected(con: ConnectionInfoSimple): boolean
    {
        if(!con) return false;
        if(!con.original.catalog) return false;
        return con.original.catalog.isCapable(CatalogCapability.CreateKeyDerivedSubCatalog);
    }
    async forgetConnection(con: ConnectionInfoSimple)
    {
        var world = this.world;
        var b = await this.modalService.openConfirmForm("Forgetting catalog", "Are you sure you want to forget this catalog? This operation is not recoverable.")
        if(!b) return;

        // note the order: closeCatalog will trigger the callback which refreshes this component
        world.removeConnectionAndSaveSettings(con.original.rawConnection);
        if(con.original.catalog) // it might be null if the catalog is damaged/unmounted!
           world.closeCatalog(con.original.catalog);
    }

    async forgetMasterKey(mk: MasterKeyInfo)
    {
        var world = this.world;
        var b = await this.modalService.openConfirmForm("Forgetting master key", "Are you sure you want to forget this master key? This operation is not recoverable.")
        if(!b) return;

        await world.removeMasterKeyAndSaveSettings(mk);
        this.refreshConnections();
    }
    private refreshConnections()
    {
        this.catalogsInfo = this.world.getInfoAboutConnections();
        var d :ConnectionInfoSimple[] = this.catalogsInfo.connections.map(x => {
            var re : ConnectionInfoSimple = {
                original: x,
                cached: x.masterKeys.length,
                catalogId: x.rawConnection.getUniqueId(),
                mounted: x.catalog != null ? "yes" : "no",
            }
            return re;
        });

        this.connectionsDatasource = new MatTableDataSource<ConnectionInfoSimple>(d);
        this.connectionsDatasource.paginator = this.connectionsPaginator;

        this.masterKeysDatasource = new MatTableDataSource<MasterKeyInfo>(this.catalogsInfo.masterKeys);
        this.masterKeysDatasource.paginator = this.masterKeysPaginator;

        this.initSorters();
    }
    ngAfterViewInit() {
        this.initSorters();
    }
    initSorters(){
        if(!this.sorters) return;
        var sorters = this.sorters.toArray();
        this.connectionsDatasource.sort = sorters[0];
        this.masterKeysDatasource.sort = sorters[1];
    }
    ngOnInit(): void {
        // this is needed as the manage page might be rendered before opening in the background completes
        this.world.openRootCatalog.subscribe(()=>{
            this.refreshConnections();
        });
        this.world.closeRootCatalog.subscribe(()=>{
            this.refreshConnections();
        });
        this.refreshConnections();
    }
    ngOnDestroy(): void {
       // Do not forget to unsubscribe the event
       // this.world.openRootCatalog.unsubscribe();
    }

}
