import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { StepsComponent } from './steps/steps.component';
import { FormsModule } from '@angular/forms';
import { DateselectionComponent } from './dateselection/dateselection.component';

@NgModule({
    declarations: [StepsComponent, DateselectionComponent],
    imports: [ CommonModule, FormsModule, IonicModule ],
    exports: [StepsComponent, DateselectionComponent],
    providers: [],
})
export class ComponentsModule {}
