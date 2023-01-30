import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { isPlatformBrowser } from '@angular/common';

import { SeoService } from '../../../services/seo/seo.service';

@Component({
  selector: 'app-tutorial',
  templateUrl: './tutorial.component.html',
  styleUrls: ['./tutorial.component.css']
})
export class TutorialComponent implements OnInit {

  name = environment.application.name;
  angular = environment.application.angular;
  bootstrap = environment.application.bootstrap;
  fontawesome = environment.application.fontawesome;

  vehicules: any = [];

  constructor(
    private seoService: SeoService,
    @Inject(PLATFORM_ID) private platformId: object) {

    this.vehicules=[];
    this.seoService.getVehicles().subscribe(result =>{
      this.vehicules=result;
    })
  }

  ngOnInit(): void {

    const content =
      'Cette application a été développée avec Angular version 15.1.1 et bootstrap 5.2.3' +
      ' Elle applique le Routing, le Lazy loading, le Server side rendering et les Progressive Web App (PWA)';

    const title = 'E-Garage : Liste des vehicules';

    this.seoService.setMetaDescription(content);
    this.seoService.setMetaTitle(title);

  }

  

  loadScript(name: string): void {

    if (isPlatformBrowser(this.platformId)) {
      const src = document.createElement('script');
      src.type = 'text/javascript';
      src.src = name;
      src.async = false;
      document.getElementsByTagName('head')[0].appendChild(src);
    }
  }

}

