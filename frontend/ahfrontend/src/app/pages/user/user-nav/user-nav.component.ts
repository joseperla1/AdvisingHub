import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LoginService } from '../../../login/login.service';

@Component({
  selector: 'app-user-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './user-nav.component.html',
  styleUrls: ['./user-nav.component.css'],
})
export class UserNavComponent {
  private router = inject(Router);
  private loginService = inject(LoginService);

  logout(): void {
    this.loginService.logout();
    void this.router.navigate(['/login']);
  }
}
