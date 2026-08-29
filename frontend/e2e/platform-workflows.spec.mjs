import { expect, test } from '@playwright/test';

const appUrl=(process.env.E2E_BASE_URL??'http://localhost:3000').replace(/\/$/,'');
const mailpitUrl=(process.env.MAILPIT_URL??'http://localhost:8025').replace(/\/$/,'');
const adminEmail=process.env.APP_ADMIN_EMAIL??'admin@enacademy.local';
const adminPassword=process.env.APP_ADMIN_PASSWORD??'ChangeMe123!';

async function latestMailText(request,expectedPath){
  for(let attempt=0;attempt<40;attempt++){
    const response=await request.get(`${mailpitUrl}/api/v1/message/latest`);
    if(response.ok()){
      const message=await response.json();
      const body=String(message.Text??message.text??'');
      if(body.includes(expectedPath))return body;
    }
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  throw new Error(`Mailpit did not receive a message containing ${expectedPath}`);
}

function tokenFrom(message,path){
  const escaped=path.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const match=message.match(new RegExp(`${escaped}\\?token=([A-Za-z0-9_-]+)`));
  if(!match)throw new Error(`No one-time token found for ${path}`);
  return match[1];
}

async function jsonCall(request,path,{method='GET',token,data}={}){
  const response=await request.fetch(`${appUrl}${path}`,{
    method,
    headers:{...(token?{Authorization:`Bearer ${token}`}:{})},
    ...(data===undefined?{}:{data}),
  });
  const body=await response.json().catch(()=>({}));
  expect(response.ok(),`${method} ${path}: ${body.detail??response.statusText()}`).toBeTruthy();
  return body;
}

test('registration, resend, approval, recovery, purchase, lesson completion, and suspension work together',async({page,request})=>{
  await request.delete(`${mailpitUrl}/api/v1/messages`).catch(()=>undefined);
  const unique=Date.now().toString(36);
  const email=`e2e-${unique}@example.test`;
  const oldPassword='OldStrongPass2026';
  const newPassword='NewStrongPass2026';

  const loginResponse=await page.goto('/login');
  expect(loginResponse?.headers()['content-security-policy']).toContain("script-src 'self' 'nonce-");
  expect(loginResponse?.headers()['x-frame-options']).toBe('DENY');
  expect(loginResponse?.headers()['x-content-type-options']).toBe('nosniff');

  await page.getByRole('button',{name:'Create account'}).click();
  await page.locator('input[name="fullName"]').fill('End to End Student');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(oldPassword);
  await page.getByRole('button',{name:/Create student account/}).click();
  await expect(page.getByRole('status')).toContainText('Account created');

  await page.goto('/resend-verification');
  await page.locator('input[name="email"]').fill(email);
  await page.getByRole('button',{name:'Send verification email'}).click();
  await expect(page.getByRole('status')).toContainText('new email has been sent');
  const verificationMail=await latestMailText(request,'/verify');
  const verificationToken=tokenFrom(verificationMail,'/verify');

  await page.goto(`/verify?token=${verificationToken}`);
  await expect(page.getByRole('heading',{name:'Email verified.'})).toBeVisible();

  const adminSession=await jsonCall(request,'/api/v1/auth/login',{
    method:'POST',data:{email:adminEmail,password:adminPassword},
  });
  const adminOverview=await jsonCall(request,'/api/v1/admin/students',{token:adminSession.accessToken});
  const student=adminOverview.students.find(candidate=>candidate.email===email);
  expect(student,'new student appears in the admin approval queue').toBeTruthy();
  await jsonCall(request,`/api/v1/admin/students/${student.id}/status`,{
    method:'PATCH',token:adminSession.accessToken,data:{status:'APPROVED'},
  });

  await page.goto('/login');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(oldPassword);
  await page.getByRole('button',{name:/Sign in securely/}).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto('/forgot-password');
  await page.locator('input[name="email"]').fill(email);
  await page.getByRole('button',{name:'Send reset link'}).click();
  await expect(page.getByRole('status')).toContainText('reset email has been sent');
  const resetMail=await latestMailText(request,'/reset-password');
  const resetToken=tokenFrom(resetMail,'/reset-password');
  await page.goto(`/reset-password?token=${resetToken}`);
  await page.locator('input[name="password"]').fill(newPassword);
  await page.locator('input[name="confirmation"]').fill(newPassword);
  await page.getByRole('button',{name:'Change password'}).click();
  await expect(page.getByRole('heading',{name:'Your password has changed.'})).toBeVisible();

  const oldLogin=await request.post(`${appUrl}/api/v1/auth/login`,{data:{email,password:oldPassword}});
  expect(oldLogin.status()).toBe(401);
  const studentSession=await jsonCall(request,'/api/v1/auth/login',{
    method:'POST',data:{email,password:newPassword},
  });
  const studentToken=studentSession.accessToken;

  const products=await jsonCall(request,'/api/v1/store/products',{token:studentToken});
  const course=products.find(product=>product.slug==='complete-a1');
  expect(course).toBeTruthy();
  const purchase=await jsonCall(request,'/api/v1/store/purchases',{
    method:'POST',token:studentToken,data:{productIds:[course.id]},
  });
  expect(purchase.status).toBe('APPROVED');
  expect(purchase.invoiceId).toBeTruthy();

  const dashboard=await jsonCall(request,'/api/v1/learning/lessons/a1-first-hello/complete',{
    method:'POST',token:studentToken,data:{score:100},
  });
  expect(dashboard.completedLessons).toBe(1);

  await jsonCall(request,`/api/v1/admin/students/${student.id}/status`,{
    method:'PATCH',token:adminSession.accessToken,data:{status:'SUSPENDED'},
  });
  const suspendedDashboard=await request.get(`${appUrl}/api/v1/learning/dashboard`,{
    headers:{Authorization:`Bearer ${studentToken}`},
  });
  expect(suspendedDashboard.status()).toBe(403);
});
