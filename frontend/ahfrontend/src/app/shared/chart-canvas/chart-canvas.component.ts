import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {
  Chart,
  ChartConfiguration,
  ChartData,
  ChartOptions,
  ChartType,
  registerables,
} from 'chart.js';

@Component({
  selector: 'app-chart-canvas',
  standalone: true,
  template: `<div class="chart-wrap" [style.height.px]="height"><canvas #canvas></canvas></div>`,
  styles: [
    `
      .chart-wrap {
        width: 100%;
        position: relative;
      }
      canvas {
        width: 100%;
        height: 100%;
        display: block;
      }
    `,
  ],
})
export class ChartCanvasComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) type: ChartType = 'bar';
  @Input({ required: true }) data: ChartData = { labels: [], datasets: [] };
  @Input() options: ChartOptions = {};
  @Input() height = 230;

  @ViewChild('canvas') private canvasRef?: ElementRef<HTMLCanvasElement>;

  private static registered = false;
  private chart?: Chart;
  private viewReady = false;

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.ensureRegistered();
    this.createOrUpdateChart();
  }

  ngOnChanges(_changes: SimpleChanges): void {
    if (!this.viewReady) return;
    this.createOrUpdateChart();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private ensureRegistered(): void {
    if (ChartCanvasComponent.registered) return;
    Chart.register(...registerables);
    ChartCanvasComponent.registered = true;
  }

  private createOrUpdateChart(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    const config: ChartConfiguration = {
      type: this.type,
      data: this.data,
      options: this.options,
    };

    if (!this.chart) {
      this.chart = new Chart(canvas, config);
      return;
    }

    this.chart.destroy();
    this.chart = new Chart(canvas, config);
  }
}

