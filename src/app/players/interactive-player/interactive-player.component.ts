import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { delay, first, mergeMap, tap } from 'rxjs/operators';
import { HelperService } from 'src/app/services/helper/helper.service';
import { ConfigService } from 'src/app/services/config/config.service';

@Component({
  selector: 'app-interactive-player',
  templateUrl: './interactive-player.component.html',
  styleUrls: ['./interactive-player.component.scss']
})
export class InteractivePlayerComponent implements OnInit {

  constructor(
    private activatedRoute: ActivatedRoute,
    private helperService: HelperService,
    private configService: ConfigService
  ) { }
  value: any;
  public queryParams: any;
  public contentDetails: any;
  playerConfig = this.configService.playerConfig.INTERACTIVE_PLAYER;
  isLoading = true;

  @ViewChild('preview', { static: false }) previewElement: ElementRef;

  // tslint:disable-next-line:use-lifecycle-interface
  ngAfterViewInit() {
    const src = this.previewElement.nativeElement.src;
    this.previewElement.nativeElement.src = '';
    this.previewElement.nativeElement.src = src;
    this.previewElement.nativeElement.onload = () => {
      this.previewElement.nativeElement.contentWindow.initializePreview(this.playerConfig);
      this.previewElement.nativeElement.contentWindow.addEventListener('message', resp => {
        if (resp.data === 'renderer:question:submitscore') {
          alert('Score has been submited succesfully');
        } else if (resp.data && typeof resp.data === 'object') {
          if (resp.data['player.pdf-renderer.error']) {
            const pdfError = resp.data['player.pdf-renderer.error'];
            if (pdfError.name === 'MissingPDFException') {
              alert('This Pdf has some issue, please try with the differnet pdf content');
            }
          } else if (resp.data && resp.data.event === 'renderer:maxLimitExceeded') {
            alert('Max limit reached to attempt the quiz');
          }
        }
      });
    };
  }
  ngOnInit(): void {
    this.queryParams = this.activatedRoute.snapshot.queryParams;
    this.getContentDetails().pipe(first(),
      tap((data: any) => {
        if (this.contentDetails){
          this.playerConfig.metadata = this.contentDetails;
          this.playerConfig.data = this.contentDetails.body;
          this.previewElement.nativeElement.contentWindow.location.reload();
          setTimeout(() => {
            this.previewElement.nativeElement.contentWindow.initializePreview(this.playerConfig);
          }, 2000);
        }
      }))
      .subscribe((data) => {
        this.isLoading = false;
      },
        (error) => {
          alert('Error to load interactive content, Loading default content');
          this.isLoading = false;
          console.log('error --->', error);
        }
      );
  }

  private getContentDetails() {
    if (this.queryParams.identifier) {
      const options: any = { params: { fields: 'body,mimeType,name,artifactUrl' } };
      return this.helperService.getContent(this.queryParams.identifier, options).
        pipe(mergeMap((data) => {
          this.contentDetails = data.result.content;
          return of(data);
        }));
    } else {
      return of({});
    }
  }

  playerEvents(event) {

  }
  playerTelemetryEvents(event) {

  }

  onEnter(value) {
    this.value = JSON.parse(value);
    this.playerConfig.data = this.value.result.content.body;
    this.playerConfig.metadata = this.value.result.content;
    this.previewElement.nativeElement.contentWindow.location.reload();
    setTimeout(() => {
      this.previewElement.nativeElement.contentWindow.initializePreview(this.playerConfig);
    }, 2000);
  }

  private isJSON(input): boolean {
    try {
      JSON.parse(input);
      return true;
    } catch (e) {
      return false;
    }
  }
}
