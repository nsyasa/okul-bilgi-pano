-- Haftalık nöbet şablonu tablosu
-- Bu tablo her hafta tekrar eden nöbetçi öğretmenleri saklar

CREATE TABLE IF NOT EXISTS duty_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 5),
  area TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_duty_templates_day ON duty_templates(day_of_week);

-- RLS Policies
ALTER TABLE duty_templates ENABLE ROW LEVEL SECURITY;

-- Herkes okuyabilir (player için)
CREATE POLICY "duty_templates_select" ON duty_templates
  FOR SELECT USING (true);

-- Sadece authenticated kullanıcılar yazabilir (admin için)
CREATE POLICY "duty_templates_insert" ON duty_templates
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "duty_templates_update" ON duty_templates
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "duty_templates_delete" ON duty_templates
  FOR DELETE USING (auth.role() = 'authenticated');

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_duty_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER duty_templates_updated_at
  BEFORE UPDATE ON duty_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_duty_templates_updated_at();

COMMENT ON TABLE duty_templates IS 'Haftalık nöbet şablonu - her hafta tekrar eder';
COMMENT ON COLUMN duty_templates.day_of_week IS '1=Pazartesi, 2=Salı, 3=Çarşamba, 4=Perşembe, 5=Cuma';
COMMENT ON COLUMN duty_templates.area IS 'Nöbet alanı: NÖBETÇİ İDARECİ, BAHÇE, GİRİŞ KAT, 1.KAT, 2.KAT, 3.KAT';
COMMENT ON COLUMN duty_templates.teacher_name IS 'Öğretmen adı soyadı';
