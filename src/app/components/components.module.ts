import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { StepsComponent } from './steps/steps.component';

@NgModule({
    declarations: [StepsComponent],
    imports: [ CommonModule, IonicModule ],
    exports: [StepsComponent],
    providers: [],
})
export class ComponentsModule {}
