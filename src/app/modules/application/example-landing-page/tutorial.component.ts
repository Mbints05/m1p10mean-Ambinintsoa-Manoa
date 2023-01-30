import { OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { Component, ViewEncapsulation } from '@angular/core';
import { SeoService } from '../../../services/seo/seo.service';
import { environment } from '../../../../environments/environment';
import { Client } from './client';

@Component({
  selector: 'app-example-modal',
  templateUrl: './tutorial.component.html',
  styleUrls: ['./tutorial.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class TutorialComponent implements OnInit{

  name = environment.application.name;
  angular = environment.application.angular;
  bootstrap = environment.application.bootstrap;
  fontawesome = environment.application.fontawesome;

  vehicles : any = [];
  constructor(private seoService: SeoService,@Inject(PLATFORM_ID) private platformId: object,) {
    this.vehicles=[];
    this.seoService.getVehicles().subscribe(result =>{
      this.vehicles=result;
    })
  }

  ngOnInit(): void {

    
    const title = 'E-Garage : Réparation';

    this.seoService.setMetaTitle(title);

  }
}
