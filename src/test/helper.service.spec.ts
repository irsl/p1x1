import { TestBed } from '@angular/core/testing';

import { HelperService } from 'src/app/helper.service';
import { Location, LocationStrategy, PathLocationStrategy } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

const routerSpy = {
    createUrlTree: function(){
        return "foo/bar";
    }
}

describe('HelperService', () => {
    let service: HelperService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                Location,
                { provide: LocationStrategy, useClass: PathLocationStrategy },
                { provide: Router,      useValue: routerSpy }
            ],
        });
        service = TestBed.get(HelperService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('external url generation', () => {
        expect(service.generateExternalUrl("/something")).toBe("http://localhost:9876/something");
        expect(service.generateExternalUrlForComponents(["foo", "bar"])).toBe("http://localhost:9876/foo/bar");
        expect(service.generateExternalUrlForComponents(["foo", "bar"], "xxx")).toBe("http://localhost:9876/foo/bar#xxx");
    });
    
});

