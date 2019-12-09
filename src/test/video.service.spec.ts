import { TestBed } from '@angular/core/testing';

import { VideoService } from '../app/video.service';
import { Helper } from '../app/helper';

const videoUrl = "https://www.femforgacs.hu/pixi/small";

describe("video", function(){
    let service: VideoService;
    let buffer : ArrayBuffer;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.get(VideoService);
    });

    it('checking video resolution', async () => {

        var resolution = await service.getVideoResolutionByUrl(videoUrl);
        expect(resolution).toEqual({width: 560, height: 320, duration: 5.568});  
        expect(Helper.videoDimensionsToTags(resolution)).toEqual({
            "media.width": 560,
            "media.height": 320,
            "media.resolution": '560x320',
            "media.duration": 5.568,
        });
     });
     
     it('in case of an error, the method shall throw', async () => {

        try{
            await service.getVideoResolutionByUrl(videoUrl+".does.not.exist");
            fail("Should have failed");
        }catch(e){
            // ok!
        }
     });  

     it('getting a video thumbnail', async () => {

        var ab = await service.getVideoThumbnailByUrl(videoUrl);
        expect(ab).toBeTruthy();

     });     
})

