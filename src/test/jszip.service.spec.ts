import { TestBed } from '@angular/core/testing';

import { PixiJsZip } from '../app/jszip';

describe('JsZipService', () => {

    it('creating a test zip', async () => {
        var data = await PixiJsZip.TestZip();
        expect(data.type).toBe("application/zip");
    });
});

