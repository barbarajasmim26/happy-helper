import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = isSignUp ? await signUp(email, password) : await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else if (isSignUp) {
      toast.success("Conta criada! Verifique seu e-mail.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center">
          <div className="text-4xl mb-2">🏠</div>
          <CardTitle className="text-2xl font-bold">Gestão de Imóveis</CardTitle>
          <p className="text-muted-foreground text-sm">{isSignUp ? "Criar conta" : "Entre na sua conta"}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Carregando..." : isSignUp ? "Criar conta" : "Entrar"}
            </Button>
          </form>
          <Button variant="link" className="w-full mt-2 text-muted-foreground" onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? "Já tem conta? Entrar" : "Não tem conta? Criar"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
