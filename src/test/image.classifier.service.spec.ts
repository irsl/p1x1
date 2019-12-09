import { TestBed } from '@angular/core/testing';

import { Helper } from '../app/helper';
import { ImageClassifierService } from 'src/app/image.classifier.service';

import { JpegImageDataUrl } from './image.service.spec';

describe('ImageClassifierService', () => {
    let service: ImageClassifierService;
    let buffer : ArrayBuffer = Helper.dataUrlToArrayBuffer(JpegImageDataUrl);

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.get(ImageClassifierService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('classify image (low level)', async () => {
        
        var classes = await service.classify(buffer, "image/jpeg");
        expect(classes).toEqual([
            { className: 'jelly fish', probability: 0.16144292056560516},
            { className: 'violin, fiddle', probability: 0.09090210497379303 },
            { className: 'hook, claw', probability: 0.08102154731750488 },
        ]);

    }, 30000);

    it('classify image to tags', async () => {

        var tags = await service.classifyToTags(buffer, "image/jpeg", 0.15);
        expect(tags).toEqual({'class.jelly fish':''});
        
    });
    
});

