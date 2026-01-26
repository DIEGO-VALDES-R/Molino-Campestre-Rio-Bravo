-- =====================================================
-- SCRIPT SQL PARA CREAR TABLAS EN SUPABASE
-- Ejecuta este script en el SQL Editor de Supabase
-- =====================================================

-- TABLA: clientes_interesados
CREATE TABLE clientes_interesados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  fecha_contacto TIMESTAMP DEFAULT NOW(),
  notas TEXT,
  estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'convertido', 'descartado')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- TABLA: clientes_actuales
CREATE TABLE clientes_actuales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  numero_lote TEXT NOT NULL,
  valor_lote NUMERIC NOT NULL,
  deposito_inicial NUMERIC NOT NULL,
  saldo_restante NUMERIC NOT NULL,
  numero_cuotas INTEGER NOT NULL,
  valor_cuota NUMERIC NOT NULL,
  saldo_final NUMERIC DEFAULT 0,
  forma_pago_inicial TEXT,
  forma_pago_cuotas TEXT,
  documento_compraventa TEXT,
  estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'pagado', 'mora')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- TABLA: pagos_clientes
CREATE TABLE pagos_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes_actuales(id) ON DELETE CASCADE,
  fecha_pago TIMESTAMP DEFAULT NOW(),
  monto NUMERIC NOT NULL,
  tipo_pago TEXT,
  forma_pago TEXT,
  documento_adjunto TEXT,
  notas TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- TABLA: egresos_futuros
CREATE TABLE egresos_futuros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL,
  tipo TEXT NOT NULL,
  categoria TEXT NOT NULL,
  descripcion TEXT,
  monto NUMERIC NOT NULL,
  usuario TEXT,
  adjuntos JSONB,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado', 'cancelado')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para mejorar performance
CREATE INDEX idx_clientes_actuales_lote ON clientes_actuales(numero_lote);
CREATE INDEX idx_pagos_cliente ON pagos_clientes(cliente_id);
CREATE INDEX idx_egresos_fecha ON egresos_futuros(fecha);

-- ✅ Script completado
