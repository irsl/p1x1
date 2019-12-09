import { TestBed } from '@angular/core/testing';

import { WorldService } from '../app/world.service';
import { CatalogService } from 'src/app/catalog.service';
import { ReadonlyLocalStorage } from 'src/app/localstorage.service';
import { GetS3ConnectionForTesting } from './s3.spec';
import { HttpClientModule } from '@angular/common/http';
import { HttpClientService } from 'src/app/httpclient.service';

describe('WorldService', () => {
    let catalogService: CatalogService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientModule],
            providers: [
                HttpClientService,
              ],    


        });
        catalogService = TestBed.get(CatalogService);
    });

    it('shall work even if nothing is stored currently in the settings', () => {
        var storageService = new ReadonlyLocalStorage({
        });

        var world = new WorldService(storageService, catalogService, null, null);
        var info = world.getInfoAboutConnections();
        expect(info.connections.length).toBe(0);
        expect(info.masterKeys.length).toBe(0);        
    });

    it('shall work even if no content is stored currently in the settings', () => {
        var storageService = new ReadonlyLocalStorage({
            "pixi-user-settings": {s3Connections:[]},
            "pixi-master-keys": {cachedMasterKeys:[]}
        });

        var world = new WorldService(storageService, catalogService, null, null);
        var info = world.getInfoAboutConnections();
        expect(info.connections.length).toBe(0);
        expect(info.masterKeys.length).toBe(0);        
    });

    it('and shall return correct info about the connections when there are some stuff', async () => {
        var s3conn = GetS3ConnectionForTesting("typical-catalog-clear");
        var uniqId = s3conn.getUniqueId();
        var rawData = {
            "pixi-user-settings": {},
            "pixi-connections": {s3Connections:[
                s3conn
            ]},
            "pixi-master-keys": {
                cachedMasterKeys:[
                {
                    connectionId: uniqId,
                    comment: "whatever!",
                    key: {
                    "alg":"A256GCM", 
                    "ext": true, 
                    "k": "9QrdUTKcNPNUseIisFWYrnWrUxmea1Puc2RRAKxj3-A",
                    "key_ops": ["encrypt", "decrypt", "wrapKey", "unwrapKey"], 
                    "kty": "oct"
                    }
                }
            ]}
        };
        var storageService = new ReadonlyLocalStorage(rawData);

        var world = new WorldService(storageService, catalogService, null, null);
        var info = world.getInfoAboutConnections();
        expect(info.connections.length).toBe(1);
        expect(info.connections[0].catalog).toBeNull();
        expect(info.connections[0].masterKeys.length).toBe(1);
        expect(info.connections[0].masterKeys[0].connectionId).toBe(uniqId);
        expect(info.connections[0].masterKeys[0]).toEqual(rawData["pixi-master-keys"].cachedMasterKeys[0]);
        expect(info.connections[0].rawConnection.getUniqueId()).toBe(uniqId);
        expect(info.masterKeys.length).toBe(1);
        expect(info.masterKeys[0]).toEqual(rawData["pixi-master-keys"].cachedMasterKeys[0]);

        await world.mountNewStandardCatalog(s3conn, ()=>{}, false, false)
        info = world.getInfoAboutConnections();
        expect(info.connections.length).toBe(1);
        expect(info.connections[0].catalog).toBeTruthy();
        expect(info.connections[0].catalog.getUniqueId()).toBeTruthy(uniqId);
    });
});

