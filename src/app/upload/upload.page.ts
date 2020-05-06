import { Component, OnInit } from '@angular/core';
import { ImagePicker } from '@ionic-native/image-picker/ngx';
import { ActionSheetController, Platform, LoadingController } from '@ionic/angular';
import {
  MediaCapture,
  MediaFile,
  CaptureError
} from '@ionic-native/media-capture/ngx';
import { File, FileEntry } from '@ionic-native/File/ngx';
import { Media, MediaObject } from '@ionic-native/media/ngx';
import { StreamingMedia } from '@ionic-native/streaming-media/ngx';
import { PhotoViewer } from '@ionic-native/photo-viewer/ngx';
import { Camera, CameraOptions } from '@ionic-native/camera/ngx';
import { FileTransfer, FileUploadOptions, FileTransferObject } from '@ionic-native/file-transfer/ngx';

const MEDIA_FOLDER_NAME = 'my_media';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPE = 'video/mp4';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.page.html',
  styleUrls: ['./upload.page.scss'],
})
export class UploadPage implements OnInit {

  public files: any[];
  public loader: any;
  public imageflag: boolean;
  isUploading: boolean = false;
  uploadPercent: number = 0;
  videoFileUpload: FileTransferObject;

  constructor(
    private imagePicker: ImagePicker,
    private mediaCapture: MediaCapture,
    private file: File,
    private media: Media,
    private streamingMedia: StreamingMedia,
    private photoViewer: PhotoViewer,
    private actionSheetController: ActionSheetController,
    private plt: Platform,
    private camera: Camera,
    private loadingController: LoadingController,
    private transfer: FileTransfer,
  ) {
    this.files = [];
    this.imageflag = false;
  }

  ngOnInit() {
    this.plt.ready().then(() => {
      const path = this.file.dataDirectory;
      this.file.checkDir(path, MEDIA_FOLDER_NAME).then(
        () => {
          this.loadFiles();
        },
        err => {
          this.file.createDir(path, MEDIA_FOLDER_NAME, false);
        }
      );
    });
  }

  loadFiles() {
    this.file.listDir(this.file.dataDirectory, MEDIA_FOLDER_NAME).then(
      res => {
        this.files = res;
      },
      err => console.log('error loading files: ', err)
    );
  }

  async selectMedia() {
    const actionSheet = await this.actionSheetController.create({
      header: 'What would you like to add?',
      buttons: [
        {
          text: 'Capture Image',
          handler: () => {
            this.captureImage();
          }
        },
        {
          text: 'Record Video',
          handler: () => {
            this.recordVideo();
          }
        },
        {
          text: 'Upload Images',
          handler: () => {
            this.selectMultiple();
          }
        },
        {
          text: 'Upload Video',
          handler: () => {
            this.pickVideo();
          }
        },
        {
          text: 'Cancel',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present(); 
  }

  pickVideo() {
    // If you get problems on Android, try to ask for Permission first
    // this.imagePicker.requestReadPermission().then(result => {
    //   console.log('requestReadPermission: ' + result);
    //   this.selectMultiple();
    // });

    const options: CameraOptions = {
      quality: 100,
      sourceType: this.camera.PictureSourceType.PHOTOLIBRARY,
      destinationType: this.camera.DestinationType.FILE_URI,
      mediaType: this.camera.MediaType.VIDEO
    };

    this.camera.getPicture(options).then(async (videoUrl) => {
      const path = `file://${videoUrl}`;
      let retrievedFile;
      const filename = videoUrl.substr(videoUrl.lastIndexOf('/') + 1);
      let dirpath = videoUrl.substr(0, videoUrl.lastIndexOf('/') + 1);
      dirpath = dirpath.includes('file://') ? dirpath : 'file://' + dirpath;

      try {
        const dirUrl = await this.file.resolveDirectoryUrl(dirpath);
        retrievedFile = await this.file.getFile(dirUrl, filename, {});

      } catch (err) {
        alert('Error Something went wrong.');
        this.hideLoader();
      }
      retrievedFile.file(data => {
        if (data.size > MAX_FILE_SIZE) {
          alert('Error You cannot upload more than 5mb.');
          // this.hideLoader();
        } else {
          this.copyFileToLocalDir(path);
          this.hideLoader();
          alert('aaa');
        }
        if (data.type !== ALLOWED_MIME_TYPE) {
          alert('Error Incorrect file type.');
        }
      });
    }, (err) => {
      // Handle error
    });
  }

  selectMultiple() {
    this.imageflag = true;
    this.imagePicker.getPictures({ allow_video: true }).then(
      results => {
        for (const result of results) {
          this.copyFileToLocalDir(result);
        }
      }
    );
  }

  captureImage() {
    this.mediaCapture.captureImage().then(
      (data: MediaFile[]) => {
        if (data.length > 0) {
          this.copyFileToLocalDir(data[0].fullPath);
        }
      },
      (err: CaptureError) => console.log(JSON.stringify(err))
    );
  }

  recordVideo() {
    this.mediaCapture.captureVideo().then(
      (data: MediaFile[]) => {
        // if (data.size > MAX_FILE_SIZE) {
        //   alert('Error You cannot upload more than 5mb.');
        // }
        if (data.length > 0) {
          this.copyFileToLocalDir(data[0].fullPath);
        }
      },
      (err: CaptureError) => console.log(JSON.stringify(err))
    );
  }

  copyFileToLocalDir(fullPath) {
    let myPath = fullPath;
    // Make sure we copy from the right location
    if (fullPath.indexOf('file://') < 0) {
      myPath = 'file://' + fullPath;
    }

    const ext = myPath.split('.').pop();
    const d = Date.now();
    const newName = `${d}.${ext}`;

    const name = myPath.substr(myPath.lastIndexOf('/') + 1);
    const copyFrom = myPath.substr(0, myPath.lastIndexOf('/') + 1);
    const copyTo = this.file.dataDirectory + MEDIA_FOLDER_NAME;

    if (!this.imageflag) {
      this.showLoader();
    }
    this.file.copyFile(copyFrom, name, copyTo, newName).then(
      success => {
        this.loadFiles();
        this.imageflag = false;
        this.hideLoader();
      },
      error => {
        console.log('error: ', error);
        this.hideLoader();
      }
    );
  }

  openFile(f: FileEntry) {
    if (f.name.indexOf('.MOV') > -1 || f.name.indexOf('.mp4') > -1) {
      // E.g: Use the Streaming Media plugin to play a video
      this.streamingMedia.playVideo(f.nativeURL);
    } else if (f.name.indexOf('.jpg') > -1 || f.name.indexOf('.jpeg') > -1) {
      // E.g: Use the Photoviewer to present an Image
      this.photoViewer.show(f.nativeURL);
    }
  }

  deleteFile(f: FileEntry) {
    const path = f.nativeURL.substr(0, f.nativeURL.lastIndexOf('/') + 1);
    this.file.removeFile(path, f.name).then(() => {
      this.loadFiles();
    }, err => console.log('error remove: ', err));
  }

  async showLoader() {
    this.loader = await this.loadingController.create({
      message: 'Please wait your file is uploding...'
    });
    await this.loader.present();
  }

  hideLoader() {
    this.loader.dismiss();
  }
}
