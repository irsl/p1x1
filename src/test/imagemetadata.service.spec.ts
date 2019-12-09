import { TestBed } from '@angular/core/testing';

import { ImageMetaInfoService } from 'src/app/image.metainfo.service';

export const JpegImageWithExif = "/9j/4AAQSkZJRgABAQEBLAEsAAD/4RLXRXhpZgAASUkqAAgAAAALAA4BAgALAAAAkgAAAA8BAgAGAAAAnQAAABABAgAGAAAAowAAABIBAwABAAAAAQAAABoBBQABAAAAqQAAABsBBQABAAAAsQAAACgBAwABAAAAAgAAADEBAgAcAAAAuQAAADIBAgAUAAAA1QAAABMCAwABAAAAAgAAAGmHBAABAAAA7AAAAIgDAAAgICAgICAgICAgAE5JS09OAEU0NjAwACwBAAABAAAALAEAAAEAAABBZG9iZSBQaG90b3Nob3AgQ1MzIFdpbmRvd3MAMjAwODowNTowOCAxNDo1NDo0NgAAAAAiAJqCBQABAAAAigIAAJ2CBQABAAAAkgIAACKIAwABAAAAAgAAACeIAwABAAAAMgAAAACQBwAEAAAAMDIyMAOQAgAUAAAAmgIAAASQAgAUAAAArgIAAAGRBwAEAAAAAQIDAAKRBQABAAAAwgIAAASSCgABAAAAygIAAAWSBQABAAAA0gIAAAeSAwABAAAABQAAAAiSAwABAAAABAAAAAmSAwABAAAAEAAAAAqSBQABAAAA2gIAAIaSBwB9AAAA4gIAAACgBwAEAAAAMDEwMAGgAwABAAAAAQAAAAKgBAABAAAAAQAAAAOgBAABAAAAAQAAAAWgBAABAAAAaAMAAACjBwABAAAAAwAAAAGjBwABAAAAAQAAAAGkAwABAAAAAAAAAAKkAwABAAAAAAAAAAOkAwABAAAAAQAAAASkBQABAAAAXwMAAAWkAwABAAAAZgAAAAakAwABAAAAAAAAAAekAwABAAAAAAAAAAikAwABAAAAAAAAAAmkAwABAAAAAAAAAAqkAwABAAAAAAAAAAykAwABAAAAAAAAAAAAAAAKAAAAzAYAAFIAAAAKAAAAMjAwNjowNjoxMyAxNTo0NDo0NQAyMDA2OjA2OjEzIDE1OjQ0OjQ1AAIAAAABAAAAAAAAAAoAAAAeAAAACgAAAKsAAAAKAAAAAAAAAAAAAAAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAAAAAAZAAAAAACAAEAAgAEAAAAUjk4AAIABwAEAAAAMDEwMAAAAAAAAAYAAwEDAAEAAAAGAAAAGgEFAAEAAADWAwAAGwEFAAEAAADeAwAAKAEDAAEAAAACAAAAAQIEAAEAAADmAwAAAgIEAAEAAADpDgAAAAAAAEgAAAABAAAASAAAAAEAAAD/2P/gABBKRklGAAEBAQEsASwAAP/bAEMAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAgIBAQIBAQECAgICAgICAgIBAgICAgICAgICAv/bAEMBAQEBAQEBAQEBAQIBAQECAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAv/AABEIAHgAeAMBIgACEQEDEQH/xAAVAAEBAAAAAAAAAAAAAAAAAAAABv/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAVAQEBAAAAAAAAAAAAAAAAAAAABP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/ALAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/9kAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+ETXWh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8APD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNC4xLWMwMzYgNDYuMjc2NzIwLCBNb24gRmViIDE5IDIwMDcgMjI6NDA6MDggICAgICAgICI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnRpZmY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vdGlmZi8xLjAvIiB4bWxuczp4YXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmV4aWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vZXhpZi8xLjAvIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1sbnM6eGFwTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHRpZmY6T3JpZW50YXRpb249IjEiIHRpZmY6WUNiQ3JQb3NpdGlvbmluZz0iMiIgdGlmZjpYUmVzb2x1dGlvbj0iMzAwMDAwMC8xMDAwMCIgdGlmZjpZUmVzb2x1dGlvbj0iMzAwMDAwMC8xMDAwMCIgdGlmZjpSZXNvbHV0aW9uVW5pdD0iMiIgdGlmZjpNYWtlPSJOSUtPTiIgdGlmZjpNb2RlbD0iRTQ2MDAiIHRpZmY6TmF0aXZlRGlnZXN0PSIyNTYsMjU3LDI1OCwyNTksMjYyLDI3NCwyNzcsMjg0LDUzMCw1MzEsMjgyLDI4MywyOTYsMzAxLDMxOCwzMTksNTI5LDUzMiwzMDYsMjcwLDI3MSwyNzIsMzA1LDMxNSwzMzQzMjs0QkYxQzRGQTI3NTZERUFCQkYyRUUwNTJBNUI4RkJFNSIgeGFwOk1vZGlmeURhdGU9IjIwMDgtMDUtMDhUMTQ6NTQ6NDYrMDI6MDAiIHhhcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTMyBXaW5kb3dzIiB4YXA6Q3JlYXRlRGF0ZT0iMjAwOC0wNS0wOFQxNDo1NDo0NiswMjowMCIgeGFwOk1ldGFkYXRhRGF0ZT0iMjAwOC0wNS0wOFQxNDo1NDo0NiswMjowMCIgZXhpZjpFeGlmVmVyc2lvbj0iMDIyMCIgZXhpZjpGbGFzaHBpeFZlcnNpb249IjAxMDAiIGV4aWY6Q29sb3JTcGFjZT0iMSIgZXhpZjpDb21wcmVzc2VkQml0c1BlclBpeGVsPSIyLzEiIGV4aWY6UGl4ZWxYRGltZW5zaW9uPSI0MDAiIGV4aWY6UGl4ZWxZRGltZW5zaW9uPSIzMDAiIGV4aWY6RGF0ZVRpbWVPcmlnaW5hbD0iMjAwNi0wNi0xM1QxNTo0NDo0NSswMjowMCIgZXhpZjpEYXRlVGltZURpZ2l0aXplZD0iMjAwNi0wNi0xM1QxNTo0NDo0NSswMjowMCIgZXhpZjpFeHBvc3VyZVRpbWU9IjEwLzE3NDAiIGV4aWY6Rk51bWJlcj0iODIvMTAiIGV4aWY6RXhwb3N1cmVQcm9ncmFtPSIyIiBleGlmOkV4cG9zdXJlQmlhc1ZhbHVlPSIwLzEwIiBleGlmOk1heEFwZXJ0dXJlVmFsdWU9IjMwLzEwIiBleGlmOk1ldGVyaW5nTW9kZT0iNSIgZXhpZjpMaWdodFNvdXJjZT0iNCIgZXhpZjpGb2NhbExlbmd0aD0iMTcxLzEwIiBleGlmOkZpbGVTb3VyY2U9IjMiIGV4aWY6U2NlbmVUeXBlPSIxIiBleGlmOkN1c3RvbVJlbmRlcmVkPSIwIiBleGlmOkV4cG9zdXJlTW9kZT0iMCIgZXhpZjpXaGl0ZUJhbGFuY2U9IjEiIGV4aWY6RGlnaXRhbFpvb21SYXRpbz0iMC8xMDAiIGV4aWY6Rm9jYWxMZW5ndGhJbjM1bW1GaWxtPSIxMDIiIGV4aWY6U2NlbmVDYXB0dXJlVHlwZT0iMCIgZXhpZjpHYWluQ29udHJvbD0iMCIgZXhpZjpDb250cmFzdD0iMCIgZXhpZjpTYXR1cmF0aW9uPSIwIiBleGlmOlNoYXJwbmVzcz0iMCIgZXhpZjpTdWJqZWN0RGlzdGFuY2VSYW5nZT0iMCIgZXhpZjpOYXRpdmVEaWdlc3Q9IjM2ODY0LDQwOTYwLDQwOTYxLDM3MTIxLDM3MTIyLDQwOTYyLDQwOTYzLDM3NTEwLDQwOTY0LDM2ODY3LDM2ODY4LDMzNDM0LDMzNDM3LDM0ODUwLDM0ODUyLDM0ODU1LDM0ODU2LDM3Mzc3LDM3Mzc4LDM3Mzc5LDM3MzgwLDM3MzgxLDM3MzgyLDM3MzgzLDM3Mzg0LDM3Mzg1LDM3Mzg2LDM3Mzk2LDQxNDgzLDQxNDg0LDQxNDg2LDQxNDg3LDQxNDg4LDQxNDkyLDQxNDkzLDQxNDk1LDQxNzI4LDQxNzI5LDQxNzMwLDQxOTg1LDQxOTg2LDQxOTg3LDQxOTg4LDQxOTg5LDQxOTkwLDQxOTkxLDQxOTkyLDQxOTkzLDQxOTk0LDQxOTk1LDQxOTk2LDQyMDE2LDAsMiw0LDUsNiw3LDgsOSwxMCwxMSwxMiwxMywxNCwxNSwxNiwxNywxOCwyMCwyMiwyMywyNCwyNSwyNiwyNywyOCwzMDtBN0U5NzY2Qjc4NUQyREI1RjVGQzI5MzZFQjE3RUNDRCIgZGM6Zm9ybWF0PSJpbWFnZS9qcGVnIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIiBwaG90b3Nob3A6SUNDUHJvZmlsZT0ic1JHQiBJRUM2MTk2Ni0yLjEiIHBob3Rvc2hvcDpIaXN0b3J5PSIiIHhhcE1NOkluc3RhbmNlSUQ9InV1aWQ6RDZDQkNBRDVGRDFDREQxMTkwNzFFNzA5MzdFOUQ1QkQiIHhhcE1NOkRvY3VtZW50SUQ9InV1aWQ6RDVDQkNBRDVGRDFDREQxMTkwNzFFNzA5MzdFOUQ1QkQiPiA8ZXhpZjpJU09TcGVlZFJhdGluZ3M+IDxyZGY6U2VxPiA8cmRmOmxpPjUwPC9yZGY6bGk+IDwvcmRmOlNlcT4gPC9leGlmOklTT1NwZWVkUmF0aW5ncz4gPGV4aWY6Rmxhc2ggZXhpZjpGaXJlZD0iRmFsc2UiIGV4aWY6UmV0dXJuPSIwIiBleGlmOk1vZGU9IjIiIGV4aWY6RnVuY3Rpb249IkZhbHNlIiBleGlmOlJlZEV5ZU1vZGU9IkZhbHNlIi8+IDxkYzpkZXNjcmlwdGlvbj4gPHJkZjpBbHQ+IDxyZGY6bGkgeG1sOmxhbmc9IngtZGVmYXVsdCI+ICAgICAgICAgIDwvcmRmOmxpPiA8L3JkZjpBbHQ+IDwvZGM6ZGVzY3JpcHRpb24+IDx4YXBNTTpEZXJpdmVkRnJvbSByZGY6cGFyc2VUeXBlPSJSZXNvdXJjZSIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8P3hwYWNrZXQgZW5kPSJ3Ij8+/+0VMlBob3Rvc2hvcCAzLjAAOEJJTQQEAAAAAAAWHAIAAAKByBwCeAAKICAgICAgICAgIDhCSU0EJQAAAAAAEBLXQ6NqyMZ5GTvg1LkL/Z84QklNBC8AAAAAAEreAAEASAAAAEgAAAAAAAAAAAAAANACAABAAgAAAAAAAAAAAAAYAwAAZAIAAAABwAMAALAEAAABAA8nAQBKAFAARwAAAGUAAABjADhCSU0D7QAAAAAAEAEsAAAAAQACASwAAAABAAI4QklNBCYAAAAAAA4AAAAAAAAAAAAAP4AAADhCSU0EDQAAAAAABAAAAB44QklNBBkAAAAAAAQAAAAeOEJJTQPzAAAAAAAJAAAAAAAAAAABADhCSU0ECgAAAAAAAQAAOEJJTScQAAAAAAAKAAEAAAAAAAAAAjhCSU0D9QAAAAAASAAvZmYAAQBsZmYABgAAAAAAAQAvZmYAAQChmZoABgAAAAAAAQAyAAAAAQBaAAAABgAAAAAAAQA1AAAAAQAtAAAABgAAAAAAAThCSU0D+AAAAAAAcAAA/////////////////////////////wPoAAAAAP////////////////////////////8D6AAAAAD/////////////////////////////A+gAAAAA/////////////////////////////wPoAAA4QklNBAgAAAAAABAAAAABAAACQAAAAkAAAAAAOEJJTQQeAAAAAAAEAAAAADhCSU0EGgAAAAADRQAAAAYAAAAAAAAAAAAAASwAAAGQAAAACABEAFMAQwBOADAANgAxADQAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAZAAAAEsAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAEAAAAAAABudWxsAAAAAgAAAAZib3VuZHNPYmpjAAAAAQAAAAAAAFJjdDEAAAAEAAAAAFRvcCBsb25nAAAAAAAAAABMZWZ0bG9uZwAAAAAAAAAAQnRvbWxvbmcAAAEsAAAAAFJnaHRsb25nAAABkAAAAAZzbGljZXNWbExzAAAAAU9iamMAAAABAAAAAAAFc2xpY2UAAAASAAAAB3NsaWNlSURsb25nAAAAAAAAAAdncm91cElEbG9uZwAAAAAAAAAGb3JpZ2luZW51bQAAAAxFU2xpY2VPcmlnaW4AAAANYXV0b0dlbmVyYXRlZAAAAABUeXBlZW51bQAAAApFU2xpY2VUeXBlAAAAAEltZyAAAAAGYm91bmRzT2JqYwAAAAEAAAAAAABSY3QxAAAA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";



describe('ExifService', () => {
  let imageMetaInfoService: ImageMetaInfoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    imageMetaInfoService = TestBed.get(ImageMetaInfoService);
  });

    it('should be created', () => {
       expect(imageMetaInfoService).toBeTruthy();
    });

    it('reading some exif info', () => {
        var byteCharacters = atob(JpegImageWithExif);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);

        const arrayBuffer = byteArray.buffer as ArrayBuffer;

        var tags = imageMetaInfoService.ReadMetaInfoFromImage(arrayBuffer, false);
        expect(tags["Flash"]).toBe("Flash did not fire, compulsory flash mode") // a regular string exif tag
        expect(tags["Orientation"]).toBe("1") // a regular number exif tag
        expect(tags["FNumber"]).toBe("8.2") // we expect complex numbers to be kept
        expect(tags["UserComment"]).toBeUndefined() // and other objects being removed

        var tags = imageMetaInfoService.ReadMetaInfoFromImage(arrayBuffer);
        expect(tags["exif.Flash"]).toBe("Flash did not fire, compulsory flash mode") // a regular string exif tag
        expect(tags["exif.Orientation"]).toBe("1") // a regular number exif tag
        expect(tags["exif.FNumber"]).toBe("8.2") // we expect complex numbers to be kept

     });

});

