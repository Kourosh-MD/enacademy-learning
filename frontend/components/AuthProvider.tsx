'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type SessionUser = {
  id: string; fullName: string; email: string; role: 'STUDENT' | 'ADMIN';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'; emailVerified: boolean; createdAt: string;
};
type AuthResponse = { accessToken: string; expiresIn: number; user: SessionUser };
type ApiProblem = { detail?: string; code?: string; errors?: Record<string,string> };
type AuthContextValue = {
  user: SessionUser | null; loading: boolean;
  login(email:string,password:string): Promise<void>;
  register(fullName:string,email:string,password:string): Promise<string>;
  logout(): Promise<void>;
  apiFetch<T>(path:string,init?:RequestInit): Promise<T>;
};

const AuthContext=createContext<AuthContextValue|null>(null);
let accessToken: string | null = null;

async function parseProblem(response:Response):Promise<Error & {code?:string}> {
  const problem=await response.json().catch(()=>({})) as ApiProblem;
  const error=new Error(problem.detail||'Something went wrong. Please try again.') as Error & {code?:string};
  error.code=problem.code; return error;
}

export function AuthProvider({children}:{children:React.ReactNode}) {
  const [user,setUser]=useState<SessionUser|null>(null);
  const [loading,setLoading]=useState(true);

  const refresh=useCallback(async()=>{
    const response=await fetch('/api/v1/auth/refresh',{method:'POST',credentials:'include'});
    if(!response.ok){accessToken=null;setUser(null);return false;}
    const session=await response.json() as AuthResponse;accessToken=session.accessToken;setUser(session.user);return true;
  },[]);

  useEffect(()=>{const initialize=async()=>{await refresh();setLoading(false);};void initialize();},[refresh]);

  const apiFetch=useCallback(async<T,>(path:string,init:RequestInit={}):Promise<T>=>{
    const send=()=>fetch(path,{...init,credentials:'include',headers:{...init.headers,...(accessToken?{Authorization:`Bearer ${accessToken}`}:{})}});
    let response=await send();
    if(response.status===401&&await refresh()) response=await send();
    if(!response.ok) throw await parseProblem(response);
    if(response.status===204) return undefined as T;
    return response.json() as Promise<T>;
  },[refresh]);

  const login=useCallback(async(email:string,password:string)=>{
    const response=await fetch('/api/v1/auth/login',{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify({email,password})});
    if(!response.ok) throw await parseProblem(response);
    const session=await response.json() as AuthResponse;accessToken=session.accessToken;setUser(session.user);
  },[]);
  const register=useCallback(async(fullName:string,email:string,password:string)=>{
    const response=await fetch('/api/v1/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({fullName,email,password})});
    if(!response.ok) throw await parseProblem(response);
    return ((await response.json()) as {message:string}).message;
  },[]);
  const logout=useCallback(async()=>{await fetch('/api/v1/auth/logout',{method:'POST',credentials:'include'});accessToken=null;setUser(null);},[]);
  const value=useMemo(()=>({user,loading,login,register,logout,apiFetch}),[user,loading,login,register,logout,apiFetch]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(){const value=useContext(AuthContext);if(!value)throw new Error('useAuth must be inside AuthProvider');return value;}
