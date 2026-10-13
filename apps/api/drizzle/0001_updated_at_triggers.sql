-- Convenção de FR-003: updated_at avança a cada alteração, pelo próprio banco.
-- Toda tabela nova precisa do seu trigger <tabela>_set_updated_at na migração que a cria.
CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER sessions_set_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER invites_set_updated_at BEFORE UPDATE ON invites FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER rate_limit_attempts_set_updated_at BEFORE UPDATE ON rate_limit_attempts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
