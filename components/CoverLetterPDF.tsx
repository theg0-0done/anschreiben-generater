import React from "react";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { AusbildungContext } from "../lib/storage";

// Register fonts if needed (optional for standard fonts)

const styles = StyleSheet.create({
  page: {
    padding: "45 60", // Reduced padding to ensure 1-page fit
    fontFamily: "Helvetica",
    fontSize: 10.5, // Slightly smaller font size
    lineHeight: 1.4, // Tighter line height
    color: "#222",
  },
  header: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25, // Reduced from 40
  },
  senderInfo: {
    alignItems: "flex-end",
    fontSize: 9.5,
    color: "#444",
  },
  recipientInfo: {
    marginTop: 15, // Reduced from 20
    fontSize: 10.5,
  },
  date: {
    textAlign: "right",
    marginTop: 15, // Reduced from 20
    marginBottom: 25, // Reduced from 40
  },
  subject: {
    fontSize: 11.5,
    fontWeight: "bold",
    marginBottom: 15, // Reduced from 20
  },
  salutation: {
    marginBottom: 12, // Reduced from 15
  },
  paragraph: {
    marginBottom: 12, // Reduced from 15
    textAlign: "justify",
  },
  signOff: {
    marginTop: 15, // Reduced from 20
  },
  signatureName: {
    marginTop: 20, // Reduced from 30
  }
});

interface CoverLetterPDFProps {
  context: AusbildungContext;
  hook: string;
  companyName: string;
  street: string;
  postalCity: string;
  contactSalutation: string;
  contactPerson: string;
}

export const CoverLetterPDF = ({
  context,
  hook,
  companyName,
  street,
  postalCity,
  contactSalutation,
  contactPerson
}: CoverLetterPDFProps) => {
  const dateStr = new Date().toLocaleDateString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric"
  });

  const city = context.postalCity.split(" ").pop() || "Stadt";

  let salutationLine = "Sehr geehrte Damen und Herren,";
  if (contactSalutation === "Herr" && contactPerson) {
    salutationLine = `Sehr geehrter Herr ${contactPerson},`;
  } else if (contactSalutation === "Frau" && contactPerson) {
    salutationLine = `Sehr geehrte Frau ${contactPerson},`;
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header: Sender Right */}
        <View style={styles.header}>
          <View style={{ width: "40%" }}></View>
          <View style={styles.senderInfo}>
            <Text style={{ fontWeight: "bold", color: "#000", fontSize: 11 }}>{context.firstName} {context.lastName}</Text>
            <Text>{context.streetHouse}</Text>
            <Text>{context.postalCity}</Text>
            <Text>Tel: {context.phone}</Text>
            <Text>Email: {context.email}</Text>
          </View>
        </View>

        {/* Recipient Left */}
        <View style={styles.recipientInfo}>
          <Text>{companyName}</Text>
          {contactPerson && contactSalutation && <Text>{contactSalutation === "Herr" ? "Herrn" : "Frau"} {contactPerson}</Text>}
          <Text>{street}</Text>
          <Text>{postalCity}</Text>
        </View>

        {/* Date */}
        <View style={styles.date}>
          <Text>{city}, den {dateStr}</Text>
        </View>

        {/* Subject */}
        <View style={styles.subject}>
          <Text>Bewerbung um einen Ausbildungsplatz als {context.jobTitle}</Text>
        </View>

        {/* Body */}
        <Text style={styles.salutation}>{salutationLine}</Text>
        
        {/* Dynamic Hook */}
        <Text style={styles.paragraph}>{hook}</Text>

        {/* Static Pitch */}
        <Text style={styles.paragraph}>{context.aiPitch}</Text>

        {/* Static Closing */}
        <Text style={styles.paragraph}>{context.aiClosing}</Text>

        {/* Sign Off */}
        <Text style={styles.signOff}>Mit freundlichen Grüßen</Text>
        <Text style={styles.signatureName}>{context.firstName} {context.lastName}</Text>

      </Page>
    </Document>
  );
};
