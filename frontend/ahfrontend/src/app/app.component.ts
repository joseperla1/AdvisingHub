import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
<<<<<<< HEAD
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  // ✅ Fixes: "Property 'title' does not exist on type 'AppComponent'"
  title = 'QueueSmart';
}
=======
})
export class AppComponent {}
>>>>>>> advisor queue manager dashboard
