import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LoginService } from './login.service';

@Component({
	selector: 'app-login',
	standalone: true,
	imports: [CommonModule, ReactiveFormsModule, RouterLink],
	templateUrl: './login.component.html',
	styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
	form: FormGroup;
	loading = false;
	error: string | null = null;

	constructor(private fb: FormBuilder, private loginService: LoginService, private router: Router) {
		this.form = this.fb.group({
			email: ['', [Validators.required, Validators.email]],
			password: ['', Validators.required],
			rememberMe: [false]
		});
	}

	ngOnInit(): void {
		const saved = localStorage.getItem('rememberedEmail');
		if (saved) {
			this.form.patchValue({ email: saved, rememberMe: true });
		}
	}

	async onSubmit(): Promise<void> {
		if (this.form.invalid) return;
		this.loading = true;
		this.error = null;
		try {
			const value = this.form.value as { email: string; password: string; rememberMe: boolean };
			if (value.rememberMe) {
				localStorage.setItem('rememberedEmail', value.email);
			} else {
				localStorage.removeItem('rememberedEmail');
			}

			const result = await this.loginService.login({ email: value.email, password: value.password });
			if (result.success) {
				// Route based on response role (avoid stale localStorage states)
				const role = result.user?.role || localStorage.getItem('userRole');
				console.log('Login successful, role:', role);
				if (role === 'admin') {
					await this.router.navigate(['/admin']);
				} else {
					console.log('Navigating to user dashboard');
					await this.router.navigate(['/user/dashboard']);
				}
			} else {
				this.error = result.message || 'Login failed';
				console.error('Login failed:', result.message);
			}
		} catch (e) {
			console.error('Login error:', e);
			this.error = e instanceof Error ? e.message : 'Server error';
		} finally {
			this.loading = false;
		}
	}
}

