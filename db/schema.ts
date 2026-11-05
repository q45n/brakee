import { pgTable, serial, text, integer, jsonb, timestamp, index } from 'drizzle-orm/pg-core';

/** Customer orders submitted through the checkout. Amounts are stored in baisa (1 OMR = 1000 baisa). */
export const orders = pgTable('orders', {
  id: serial().primaryKey(),
  ref: text().notNull().unique(),
  status: text().notNull().default('new'),
  customerName: text('customer_name').notNull(),
  phone: text().notNull(),
  governorate: text().notNull(),
  wilayat: text().notNull(),
  address: text().notNull(),
  vin: text(),
  notes: text().notNull().default(''),
  paymentMethod: text('payment_method').notNull(),
  lang: text().notNull().default('ar'),
  items: jsonb().notNull(),
  subtotalBaisa: integer('subtotal_baisa').notNull(),
  deliveryBaisa: integer('delivery_baisa').notNull(),
  totalBaisa: integer('total_baisa').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('orders_created_at_idx').on(t.createdAt)]);
