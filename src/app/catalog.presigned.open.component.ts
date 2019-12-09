import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { WorldService } from './world.service';

@Component({
  template: 'opening presigned catalog is in progress',
})
export class PresignedCatalogOpenComponent implements OnInit {

  constructor(
    private route: ActivatedRoute, 
    private world: WorldService,
  )
  {

  }

  ngOnInit() 
  {
      var password = this.route.snapshot.fragment;
      var presignedUrl = this.route.snapshot.params["presignedCatalogIndexUrl"];

      this.world.mountPresignedCatalog(presignedUrl, password);

  }


}
