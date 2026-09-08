import fs from "node:fs";

// Load .env variables into process.env BEFORE importing database client
if (fs.existsSync(".env")) {
  const envContent = fs.readFileSync(".env", "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const rawApiResponse = {
  "ShipmentData": [
    {
      "Shipment": {
        "AWB": "41093210924372",
        "CODAmount": 0,
        "ChargedWeight": null,
        "Consignee": {
          "Address1": [],
          "Address2": [],
          "Address3": "",
          "City": "VISAKHAPATNAM",
          "Country": "India",
          "Name": "Fathima",
          "PinCode": 530044,
          "State": "Andhra Pradesh",
          "Telephone1": "",
          "Telephone2": ""
        },
        "DeliveryDate": null,
        "DestRecieveDate": "2026-09-03T08:43:10.506",
        "Destination": "VISAKHAPATNAM",
        "DispatchCount": 1,
        "Ewaybill": [],
        "ExpectedDeliveryDate": "2026-09-04T23:59:59",
        "Extras": "",
        "FirstAttemptDate": "2026-09-03T11:50:01.44",
        "InvoiceAmount": 1999,
        "OrderType": "Pre-paid",
        "Origin": "Machilipatnam_Chilakalapudi_D (Andhra Pradesh)",
        "OriginRecieveDate": "2026-08-31T19:14:21.098",
        "OutDestinationDate": "2026-08-31T19:38:45.464",
        "PickUpDate": "2026-08-31T17:15:22",
        "PickedupDate": "2026-08-31T17:15:22",
        "PickupLocation": "Sudheer kt one gram gold",
        "PromisedDeliveryDate": "2026-09-04T23:59:59",
        "Quantity": "",
        "RTOStartedDate": null,
        "ReferenceNo": "260826Y26",
        "ReturnPromisedDeliveryDate": null,
        "ReturnedDate": null,
        "ReverseInTransit": false,
        "Scans": [
          {
            "ScanDetail": {
              "Instructions": "Manifest uploaded",
              "Scan": "Manifested",
              "ScanDateTime": "2026-08-27T17:29:06.233",
              "ScanType": "UD",
              "ScannedLocation": "Machilipatnam_Chilakalapudi_D (Andhra Pradesh)",
              "StatusCode": "X-UCI",
              "StatusDateTime": "2026-08-27T17:29:06.233"
            }
          },
          {
            "ScanDetail": {
              "Instructions": "Shipment picked up",
              "Scan": "In Transit",
              "ScanDateTime": "2026-08-31T17:15:22",
              "ScanType": "UD",
              "ScannedLocation": "Machilipatnam_Chilakalapudi_D (Andhra Pradesh)",
              "StatusCode": "X-PPOM",
              "StatusDateTime": "2026-08-31T17:15:22"
            }
          },
          {
            "ScanDetail": {
              "Instructions": "Shipment Recieved at Origin Center",
              "Scan": "In Transit",
              "ScanDateTime": "2026-08-31T19:14:21.098",
              "ScanType": "UD",
              "ScannedLocation": "Machilipatnam_Chilakalapudi_D (Andhra Pradesh)",
              "StatusCode": "X-PIOM",
              "StatusDateTime": "2026-08-31T19:14:21.098"
            }
          },
          {
            "ScanDetail": {
              "Instructions": "Added to Bag",
              "Scan": "In Transit",
              "ScanDateTime": "2026-08-31T19:38:45.774",
              "ScanType": "UD",
              "ScannedLocation": "Machilipatnam_Chilakalapudi_D (Andhra Pradesh)",
              "StatusCode": "X-DBL1F",
              "StatusDateTime": "2026-08-31T19:38:45.774"
            }
          },
          {
            "ScanDetail": {
              "Instructions": "Bag Added To Trip",
              "Scan": "In Transit",
              "ScanDateTime": "2026-09-01T09:19:55.253",
              "ScanType": "UD",
              "ScannedLocation": "Machilipatnam_Chilakalapudi_D (Andhra Pradesh)",
              "StatusCode": "X-DLL2F",
              "StatusDateTime": "2026-09-01T09:19:55.253"
            }
          },
          {
            "ScanDetail": {
              "Instructions": "Vehicle Departed",
              "Scan": "In Transit",
              "ScanDateTime": "2026-09-01T10:28:45.848",
              "ScanType": "UD",
              "ScannedLocation": "Machilipatnam_Chilakalapudi_D (Andhra Pradesh)",
              "StatusCode": "X-OLL4F",
              "StatusDateTime": "2026-09-01T10:28:45.848"
            }
          },
          {
            "ScanDetail": {
              "Instructions": "Trip Arrived",
              "Scan": "In Transit",
              "ScanDateTime": "2026-09-01T13:18:35.353",
              "ScanType": "UD",
              "ScannedLocation": "Vijayawada_Gudavalli_H (Andhra Pradesh)",
              "StatusCode": "X-ILL2F",
              "StatusDateTime": "2026-09-01T13:18:35.353"
            }
          },
          {
            "ScanDetail": {
              "Instructions": "Bag Received at Facility",
              "Scan": "In Transit",
              "ScanDateTime": "2026-09-01T14:21:58.749",
              "ScanType": "UD",
              "ScannedLocation": "Vijayawada_Gudavalli_H (Andhra Pradesh)",
              "StatusCode": "X-ILL1F",
              "StatusDateTime": "2026-09-01T14:21:58.749"
            }
          },
          {
            "ScanDetail": {
              "Instructions": "Shipment Received at Facility",
              "Scan": "In Transit",
              "ScanDateTime": "2026-09-01T14:35:42.357",
              "ScanType": "UD",
              "ScannedLocation": "Vijayawada_Gudavalli_H (Andhra Pradesh)",
              "StatusCode": "X-IBD3F",
              "StatusDateTime": "2026-09-01T14:35:42.357"
            }
          },
          {
            "ScanDetail": {
              "Instructions": "weight captured",
              "Scan": "In Transit",
              "ScanDateTime": "2026-09-01T15:43:42.738",
              "ScanType": "UD",
              "ScannedLocation": "Vijayawada_Gudavalli_H (Andhra Pradesh)",
              "StatusCode": "X-DWS",
              "StatusDateTime": "2026-09-01T15:43:42.738"
            }
          },
          {
            "ScanDetail": {
              "Instructions": "Added to Bag",
              "Scan": "In Transit",
              "ScanDateTime": "2026-09-01T18:52:17.903",
              "ScanType": "UD",
              "ScannedLocation": "Vijayawada_Gudavalli_H (Andhra Pradesh)",
              "StatusCode": "X-DBL1F",
              "StatusDateTime": "2026-09-01T18:52:17.903"
            }
          },
          {
            "ScanDetail": {
              "Instructions": "Bag Added To Trip",
              "Scan": "In Transit",
              "ScanDateTime": "2026-09-01T20:17:34.653",
              "ScanType": "UD",
              "ScannedLocation": "Vijayawada_Gudavalli_H (Andhra Pradesh)",
              "StatusCode": "X-DLL2F",
              "StatusDateTime": "2026-09-01T20:17:34.653"
            }
          },
          {
            "ScanDetail": {
              "Instructions": "Vehicle Departed",
              "Scan": "In Transit",
              "ScanDateTime": "2026-09-01T23:10:48.13",
              "ScanType": "UD",
              "ScannedLocation": "Vijayawada_Gudavalli_H (Andhra Pradesh)",
              "StatusCode": "X-OLL4F",
              "StatusDateTime": "2026-09-01T23:10:48.13"
            }
          },
          {
            "ScanDetail": {
              "Instructions": "Trip Arrived",
              "Scan": "In Transit",
              "ScanDateTime": "2026-09-02T07:37:07.496",
              "ScanType": "UD",
              "ScannedLocation": "Visakhapatnam_Duvvada_H (Andhra Pradesh)",
              "StatusCode": "X-ILL2F",
              "StatusDateTime": "2026-09-02T07:37:07.496"
            }
          },
          {
            "ScanDetail": {
              "Instructions": "Bag Received at Facility",
              "Scan": "In Transit",
              "ScanDateTime": "2026-09-02T09:32:44.398",
              "ScanType": "UD",
              "ScannedLocation": "Visakhapatnam_Duvvada_H (Andhra Pradesh)",
              "StatusCode": "X-ILL1F",
              "StatusDateTime": "2026-09-02T09:32:44.398"
            }
          },
          {
            "ScanDetail": {
              "Instructions": "Shipment Received at Facility",
              "Scan": "In Transit",
              "ScanDateTime": "2026-09-02T15:35:30.492",
              "ScanType": "UD",
              "ScannedLocation": "Visakhapatnam_Duvvada_H (Andhra Pradesh)",
              "StatusCode": "X-IBD3F",
              "StatusDateTime": "2026-09-02T15:35:30.492"
            }
          },
          {
            "ScanDetail": {
              "Instructions": "Added to Bag",
              "Scan": "In Transit",
              "ScanDateTime": "2026-09-02T16:55:04.809",
              "ScanType": "UD",
              "ScannedLocation": "Visakhapatnam_Duvvada_H (Andhra Pradesh)",
              "StatusCode": "X-DBL1F",
              "StatusDateTime": "2026-09-02T16:55:04.809"
            }
          },
          {
            "ScanDetail": {
              "Instructions": "Bag Added To Trip",
              "Scan": "In Transit",
              "ScanDateTime": "2026-09-03T04:20:25.972",
              "ScanType": "UD",
              "ScannedLocation": "Visakhapatnam_Duvvada_H (Andhra Pradesh)",
              "StatusCode": "X-DLL2F",
              "StatusDateTime": "2026-09-03T04:20:25.972"
            }
          },
          {
            "ScanDetail": {
              "Instructions": "Vehicle Departed",
              "Scan": "In Transit",
              "ScanDateTime": "2026-09-03T04:53:55.621",
              "ScanType": "UD",
              "ScannedLocation": "Visakhapatnam_Duvvada_H (Andhra Pradesh)",
              "StatusCode": "X-OLL4F",
              "StatusDateTime": "2026-09-03T04:53:55.621"
            }
          },
          {
            "ScanDetail": {
              "Instructions": "Trip Arrived",
              "Scan": "In Transit",
              "ScanDateTime": "2026-09-03T05:23:11.149",
              "ScanType": "UD",
              "ScannedLocation": "Visakhapatnam_Samatanagar_D (Andhra Pradesh)",
              "StatusCode": "X-ILL2F",
              "StatusDateTime": "2026-09-03T05:23:11.149"
            }
          },
          {
            "ScanDetail": {
              "Instructions": "Bag Received at Facility",
              "Scan": "In Transit",
              "ScanDateTime": "2026-09-03T05:48:09.85",
              "ScanType": "UD",
              "ScannedLocation": "Visakhapatnam_Samatanagar_D (Andhra Pradesh)",
              "StatusCode": "X-ILL1F",
              "StatusDateTime": "2026-09-03T05:48:09.85"
            }
          },
          {
            "ScanDetail": {
              "Instructions": "Shipment Received at Facility",
              "Scan": "Pending",
              "ScanDateTime": "2026-09-03T08:43:10.517",
              "ScanType": "UD",
              "ScannedLocation": "Visakhapatnam_Samatanagar_D (Andhra Pradesh)",
              "StatusCode": "X-IBD3F",
              "StatusDateTime": "2026-09-03T08:43:10.517"
            }
          },
          {
            "ScanDetail": {
              "Instructions": "Out for delivery",
              "Scan": "Dispatched",
              "ScanDateTime": "2026-09-03T11:50:01.44",
              "ScanType": "UD",
              "ScannedLocation": "Visakhapatnam_Samatanagar_D (Andhra Pradesh)",
              "StatusCode": "X-DDD3FD",
              "StatusDateTime": "2026-09-03T11:50:01.44"
            }
          },
          {
            "ScanDetail": {
              "Instructions": "Consignee Unavailable",
              "Scan": "Pending",
              "ScanDateTime": "2026-09-03T21:27:29.002",
              "ScanType": "UD",
              "ScannedLocation": "Visakhapatnam_Samatanagar_D (Andhra Pradesh)",
              "StatusCode": "EOD-11",
              "StatusDateTime": "2026-09-03T21:27:29.002",
              "geo_location": {
                "lat": 17.6709874,
                "long": 83.1998888
              }
            }
          }
        ],
        "SenderName": "SSSCOMMUNICATION B2C",
        "Status": {
          "Instructions": "Consignee Unavailable",
          "RecievedBy": "",
          "Status": "Pending",
          "StatusCode": "EOD-11",
          "StatusDateTime": "2026-09-03T21:27:29.002",
          "StatusLocation": "Visakhapatnam_Samatanagar_D (Andhra Pradesh)",
          "StatusType": "UD"
        }
      }
    }
  ]
};

async function seedAuditTrail() {
  const { db } = await import("../src/db");
  const { shipments, trackingEvents, orders, orderAddresses, shipmentAuditLogs } = await import("../src/db/schema");
  const { eq, or } = await import("drizzle-orm");
  const { normalizeDelhiveryEvent } = await import("../src/lib/shipping/event-normalizer");
  const { processShipmentEventExceptions } = await import("../src/services/shipping/exception-engine");
  const { nanoid } = await import("nanoid");

  const provider = process.env.DB_PROVIDER || "sqlite";
  console.log(`\n======================================================`);
  console.log(`🌐 Ingesting Audit Trail into [${provider.toUpperCase()} Database]...`);

  // Target waybills: 41093210944403 (from screenshot) and 41093210924372 (from JSON)
  const targetWaybills = ["41093210944403", "41093210924372"];
  const shipmentData = rawApiResponse.ShipmentData[0].Shipment;

  for (const waybill of targetWaybills) {
    let shipment = await db.query.shipments.findFirst({
      where: or(
        eq(shipments.waybill, waybill),
        eq(shipments.trackingNumber, waybill),
        eq(shipments.courierOrderId, waybill)
      ),
    });

    if (!shipment) {
      console.log(`ℹ️  Shipment ${waybill} not found. Creating order & shipment record in ${provider.toUpperCase()}...`);
      const orderId = `ord_${nanoid(10)}`;
      const now = new Date();

      await db.insert(orders).values({
        id: orderId,
        status: "shipped",
        totalAmount: 199900,
        createdAt: now,
        updatedAt: now,
      });

      await db.insert(orderAddresses).values({
        id: `addr_${nanoid(8)}`,
        orderId,
        type: "shipping",
        name: shipmentData.Consignee.Name || "Fathima",
        phone: "+919876543210",
        addressLine1: "Visakhapatnam, Samatanagar",
        city: shipmentData.Consignee.City || "VISAKHAPATNAM",
        state: shipmentData.Consignee.State || "Andhra Pradesh",
        postalCode: String(shipmentData.Consignee.PinCode || "530044"),
        country: "India",
        createdAt: now,
        updatedAt: now,
      });

      const shipmentId = `ship_${nanoid(10)}`;
      await db.insert(shipments).values({
        id: shipmentId,
        orderId,
        carrier: "Delhivery",
        provider: "delhivery",
        courierOrderId: `DEL-${waybill}`,
        waybill,
        trackingNumber: waybill,
        status: "in_transit",
        createdAt: now,
        updatedAt: now,
      });

      shipment = await db.query.shipments.findFirst({
        where: eq(shipments.id, shipmentId),
      });
    }

    if (!shipment) continue;

    console.log(`\n📦 Processing 24 Scan Events for Shipment: ${shipment.id} (Waybill: ${waybill}, Order: #${shipment.orderId})`);

    // Fetch existing events for deduplication
    const existingEvents = await db.query.trackingEvents.findMany({
      where: eq(trackingEvents.shipmentId, shipment.id),
    });

    const existingKeys = new Set(
      existingEvents.map((e) => `${e.status}_${e.timestamp.getTime()}_${(e.location || "").trim()}`)
    );

    let insertedCount = 0;

    for (const scanItem of shipmentData.Scans) {
      const scanDetail = scanItem.ScanDetail;
      const eventTime = new Date(scanDetail.ScanDateTime);
      const scanTimeMs = eventTime.getTime();
      const statusText = scanDetail.Instructions || scanDetail.Scan;
      const locationText = scanDetail.ScannedLocation || "";
      const scanKey = `${statusText}_${scanTimeMs}_${locationText.trim()}`;

      if (!existingKeys.has(scanKey)) {
        await db.insert(trackingEvents).values({
          id: `evt_${nanoid(10)}`,
          shipmentId: shipment.id,
          status: statusText,
          location: locationText,
          description: `${scanDetail.Scan}: ${scanDetail.Instructions} (Code: ${scanDetail.StatusCode})`,
          timestamp: eventTime,
        });
        existingKeys.add(scanKey);
        insertedCount++;

        // Pass normalized scan event into Exception Engine
        const normalizedEvt = normalizeDelhiveryEvent(shipment.id, waybill, scanItem, shipmentData);
        await processShipmentEventExceptions(normalizedEvt);
      }
    }

    // Update final shipment status to 'ndr' because the latest scan is EOD-11 Consignee Unavailable
    await db
      .update(shipments)
      .set({
        status: "ndr",
        updatedAt: new Date(),
      })
      .where(eq(shipments.id, shipment.id));

    // Record Audit Log for demonstration
    await db.insert(shipmentAuditLogs).values({
      id: `sal_${nanoid(10)}`,
      shipmentId: shipment.id,
      orderId: shipment.orderId,
      adminName: "System Ingestion",
      action: "AUDIT_TRAIL_SEEDED",
      notes: `Seeded 24 Delhivery carrier scan events and recognized NDR exception EOD-11 for client demonstration.`,
      createdAt: new Date(),
    });

    console.log(`✅ Ingested ${insertedCount} new scan events into trackingEvents.`);
    console.log(`✅ Updated Shipment Status to 'ndr' with active NDR Exception (Code: EOD-11).`);
  }
}

seedAuditTrail()
  .then(() => {
    console.log(`\n🎉 Audit trail seeding completed successfully!`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(`❌ Seeding failed:`, err);
    process.exit(1);
  });
