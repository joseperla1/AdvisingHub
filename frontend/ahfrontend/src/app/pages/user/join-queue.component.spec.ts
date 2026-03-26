import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JoinQueueComponent } from './join-queue.component';

describe('JoinQueueComponent', () => {
  let component: JoinQueueComponent;
  let fixture: ComponentFixture<JoinQueueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JoinQueueComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JoinQueueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
