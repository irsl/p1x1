import { TestBed } from '@angular/core/testing';

import { LocalStorageService } from '../app/localstorage.service';
import { Helper } from 'src/app/helper';

describe('LocalStorageService', () => {
    let service: LocalStorageService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.get(LocalStorageService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('basic usage', async () => {
        var key = "whatever";
        var data = {"a": "b"};
        service.set(key, data);
        var actual = service.getRaw(key)
        expect(actual).toEqual(data);
                        
        service.remove(key);
        var a2 = service.getRaw(key)
        expect(a2).toBeUndefined();

        var a3 = service.getRaw("non-exists");
        expect(a3).toBeUndefined();
    });
    
    it('structured usage', async () => {
        class C {
            a: string;
        }
        var key = "whatever";
        var data = Helper.create(C, {"a": "foobar!"});
        service.set(key, data);
        var actual = service.get(C, key)
        expect(JSON.stringify(actual)).toEqual(JSON.stringify(data));
        expect(actual instanceof C).toBeTruthy();
        service.remove(key);

        class D {
            a: string;
            static fromJSON(data: any): D
            {
                return Helper.create(D, {"a": "XXXX"});
            }
        }
        key = "d";
        var d = Helper.create(D, {a: "a"});
        service.set(key, d);
        actual = service.get(D, key)
        expect(actual.a).toEqual("XXXX");
        expect(actual instanceof D).toBeTruthy();
        service.remove(key);

    });

    it('storing nulls', async () => {
        var key = "whatever-null";
        var data = {"a": null};
        service.set(key, data);
        var actual = service.getRaw(key)
        expect(actual).toEqual(data);

        // cleanup
        service.remove(key);
    });
});

