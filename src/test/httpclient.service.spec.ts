import { TestBed } from '@angular/core/testing';

import { HttpClientService } from 'src/app/httpclient.service';
import { HttpClientModule } from '@angular/common/http';

describe('HttpClientService', () => {

    let httpClientService: HttpClientService;
    
    beforeEach(() => {
      TestBed.configureTestingModule({
        imports: [HttpClientModule],
        providers: [
            HttpClientService
          ],
      });
      httpClientService = TestBed.get(HttpClientService);
    });

    it("just downloading some stuff as a blob", async ()=>{
        var blob = await httpClientService.downloadUrlAsBlob("http://localhost:9876/karma.js");
        expect(blob.type).toBe("application/javascript");
        expect(blob.size).toBeGreaterThan(2000);
    })

});

