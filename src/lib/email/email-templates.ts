// Multi-language email templates with minimalist design

interface EmailContent {
  subject: string;
  htmlContent: string;
  textContent: string;
}

interface TemplateStrings {
  welcome: {
    subject: string;
    greeting: string;
    intro: string;
    ctaText: string;
    footer: string;
    readyTitle: string;
    readyDescription: string;
  };
  subscription: {
    subject: string;
    greeting: string;
    intro: string;
    features: string[];
    ctaText: string;
    footer: string;
    includedTitle: string;
    renewalNote: string;
  };
  cancellation: {
    subject: string;
    greeting: string;
    intro: string;
    details: string[];
    reactivateText: string;
    footer: string;
    whatMeansTitle: string;
    feedbackTitle: string;
    feedbackDescription: string;
    reactivateNote: string;
  };
}

const emailStrings: Record<string, TemplateStrings> = {
  en: {
    welcome: {
      subject: "Welcome to uvala",
      greeting: "Hi {{userName}}",
      intro: "Welcome to uvala! We're excited to have you on board.",
      ctaText: "Get Started",
      footer: "Best regards,<br>The uvala Team",
      readyTitle: "Ready to start?",
      readyDescription:
        "Begin your first conversation and experience the power of AI assistance.",
    },
    subscription: {
      subject: "Your {{planType}} subscription is active",
      greeting: "Hi {{userName}}",
      intro: "Your {{planType}} subscription has been activated successfully.",
      features: [
        "Premium AI models access",
        "Higher usage limits",
        "Priority support",
        "Advanced features",
      ],
      ctaText: "Go to Dashboard",
      footer: "Thank you for choosing uvala!<br>The uvala Team",
      includedTitle: "What's included",
      renewalNote:
        "Your subscription will renew automatically. Manage settings in your dashboard anytime.",
    },
    cancellation: {
      subject: "Subscription cancelled",
      greeting: "Hi {{userName}}",
      intro: "Your {{planType}} subscription has been cancelled.",
      details: [
        "Access continues until billing period ends",
        "No future charges will be made",
        "Your data remains safe",
      ],
      reactivateText: "Reactivate Subscription",
      footer: "Thank you for being part of uvala<br>The uvala Team",
      whatMeansTitle: "What this means",
      feedbackTitle: "We'd value your feedback",
      feedbackDescription:
        "Help us improve by sharing why you cancelled. Your input helps us serve users better.",
      reactivateNote:
        "You can reactivate anytime from your account settings. We'll be here when you're ready.",
    },
  },
  es: {
    welcome: {
      subject: "Bienvenido a uvala",
      greeting: "Hola {{userName}}",
      intro: "¡Bienvenido a uvala! Estamos emocionados de tenerte a bordo.",
      ctaText: "Comenzar",
      footer: "Saludos cordiales,<br>El equipo de uvala",
      readyTitle: "¿Listo para empezar?",
      readyDescription:
        "Inicia tu primera conversación y experimenta el poder de la asistencia con IA.",
    },
    subscription: {
      subject: "Tu suscripción {{planType}} está activa",
      greeting: "Hola {{userName}}",
      intro: "Tu suscripción {{planType}} ha sido activada exitosamente.",
      features: [
        "Acceso a modelos de IA premium",
        "Límites de uso más altos",
        "Soporte prioritario",
        "Funciones avanzadas",
      ],
      ctaText: "Ir al Panel",
      footer: "¡Gracias por elegir uvala!<br>El equipo de uvala",
      includedTitle: "Qué incluye",
      renewalNote:
        "Tu suscripción se renovará automáticamente. Puedes administrar la configuración en tu panel en cualquier momento.",
    },
    cancellation: {
      subject: "Suscripción cancelada",
      greeting: "Hola {{userName}}",
      intro: "Tu suscripción {{planType}} ha sido cancelada.",
      details: [
        "El acceso continúa hasta el final del período de facturación",
        "No se realizarán cargos futuros",
        "Tus datos permanecen seguros",
      ],
      reactivateText: "Reactivar Suscripción",
      footer: "Gracias por ser parte de uvala<br>El equipo de uvala",
      whatMeansTitle: "Qué significa esto",
      feedbackTitle: "Valoramos tus comentarios",
      feedbackDescription:
        "Ayúdanos a mejorar compartiendo por qué cancelaste. Tus comentarios nos ayudan a servir mejor a los usuarios.",
      reactivateNote:
        "Puedes reactivar en cualquier momento desde la configuración de tu cuenta. Estaremos aquí cuando estés listo.",
    },
  },
  fr: {
    welcome: {
      subject: "Bienvenue chez uvala",
      greeting: "Bonjour {{userName}}",
      intro: "Bienvenue chez uvala ! Nous sommes ravis de vous accueillir.",
      ctaText: "Commencer",
      footer: "Cordialement,<br>L'équipe uvala",
      readyTitle: "Prêt à commencer ?",
      readyDescription:
        "Commencez votre première conversation et découvrez la puissance de l'assistance IA.",
    },
    subscription: {
      subject: "Votre abonnement {{planType}} est actif",
      greeting: "Bonjour {{userName}}",
      intro: "Votre abonnement {{planType}} a été activé avec succès.",
      features: [
        "Accès aux modèles IA premium",
        "Limites d'utilisation plus élevées",
        "Support prioritaire",
        "Fonctionnalités avancées",
      ],
      ctaText: "Aller au Tableau de Bord",
      footer: "Merci d'avoir choisi uvala !<br>L'équipe uvala",
      includedTitle: "Ce qui est inclus",
      renewalNote:
        "Votre abonnement se renouvellera automatiquement. Vous pouvez gérer les paramètres dans votre tableau de bord à tout moment.",
    },
    cancellation: {
      subject: "Abonnement annulé",
      greeting: "Bonjour {{userName}}",
      intro: "Votre abonnement {{planType}} a été annulé.",
      details: [
        "L'accès continue jusqu'à la fin de la période de facturation",
        "Aucuns frais futurs ne seront facturés",
        "Vos données restent en sécurité",
      ],
      reactivateText: "Réactiver l'Abonnement",
      footer: "Merci d'avoir fait partie d'uvala<br>L'équipe uvala",
      whatMeansTitle: "Ce que cela signifie",
      feedbackTitle: "Nous apprécions vos commentaires",
      feedbackDescription:
        "Aidez-nous à nous améliorer en partageant pourquoi vous avez annulé. Vos commentaires nous aident à mieux servir nos utilisateurs.",
      reactivateNote:
        "Vous pouvez réactiver à tout moment depuis les paramètres de votre compte. Nous serons là quand vous serez prêt.",
    },
  },
  ja: {
    welcome: {
      subject: "uvalaへようこそ",
      greeting: "{{userName}}様",
      intro: "uvalaへようこそ！ご参加いただき、大変嬉しく思います。",
      ctaText: "始める",
      footer: "よろしくお願いいたします。<br>uvalaチーム",
      readyTitle: "始める準備はできましたか？",
      readyDescription:
        "最初の会話を始めて、AI アシスタンスの力を体験してください。",
    },
    subscription: {
      subject: "{{planType}}サブスクリプションが有効になりました",
      greeting: "{{userName}}様",
      intro: "{{planType}}サブスクリプションが正常に有効化されました。",
      features: [
        "プレミアムAIモデルへのアクセス",
        "使用制限の拡大",
        "優先サポート",
        "高度な機能",
      ],
      ctaText: "ダッシュボードへ",
      footer: "uvalaをお選びいただき、ありがとうございます！<br>uvalaチーム",
      includedTitle: "含まれる内容",
      renewalNote:
        "サブスクリプションは自動的に更新されます。ダッシュボードでいつでも設定を管理できます。",
    },
    cancellation: {
      subject: "サブスクリプションがキャンセルされました",
      greeting: "{{userName}}様",
      intro: "{{planType}}サブスクリプションがキャンセルされました。",
      details: [
        "請求期間終了まで引き続きアクセス可能",
        "今後の請求は発生しません",
        "データは安全に保たれます",
      ],
      reactivateText: "サブスクリプション再開",
      footer:
        "uvalaの一員でいてくださり、ありがとうございました<br>uvalaチーム",
      whatMeansTitle: "これが意味すること",
      feedbackTitle: "フィードバックをお聞かせください",
      feedbackDescription:
        "キャンセルの理由を教えていただくことで、サービス向上に役立てさせていただきます。",
      reactivateNote:
        "アカウント設定からいつでも再開できます。準備が整いましたら、お待ちしております。",
    },
  },
};

function getMinimalistTemplate(content: {
  subject: string;
  title: string;
  greeting: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  footer: string;
}): EmailContent {
  const logoUrl = `{{appUrl}}/uvala-logo.png`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${content.subject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif;">

        <!-- Container -->
        <div style="max-width: 560px; margin: 60px auto; background: #ffffff;">

          <!-- Header -->
          <div style="text-align: center; padding: 0 0 48px 0;">
            <img src="${logoUrl}" alt="uvala" style="height: 32px; width: auto; margin-bottom: 32px;">
            <h1 style="color: #000000; font-size: 32px; font-weight: 500; margin: 0; line-height: 1.2; letter-spacing: -0.02em;">
              ${content.title}
            </h1>
          </div>

          <!-- Content -->
          <div style="padding: 0;">

            <!-- Greeting -->
            <p style="color: #000000; font-size: 18px; margin: 0 0 32px; font-weight: 400; line-height: 1.5;">
              ${content.greeting},
            </p>

            <!-- Body -->
            <div style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 48px;">
              ${content.body}
            </div>

            ${
              content.ctaText && content.ctaUrl
                ? `
            <!-- CTA Button -->
            <div style="text-align: center; margin: 48px 0;">
              <a href="${content.ctaUrl}"
                 style="display: inline-block; background: #000000; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 500; font-size: 16px; letter-spacing: -0.01em;">
                ${content.ctaText}
              </a>
            </div>
            `
                : ""
            }

            <!-- Footer -->
            <div style="margin-top: 64px; padding-top: 32px; border-top: 1px solid #f0f0f0;">
              <p style="color: #666666; font-size: 14px; margin: 0; line-height: 1.5; text-align: center;">
                ${content.footer}
              </p>
            </div>

          </div>
        </div>

        <!-- Footer Note -->
        <div style="text-align: center; margin: 32px auto 60px; max-width: 560px;">
          <p style="color: #999999; font-size: 12px; margin: 0; line-height: 1.4;">
            <a href="{{appUrl}}" style="color: #333333; text-decoration: none;">uvala.ai</a>
          </p>
        </div>

        <!-- Mobile Responsive Styles -->
        <style>
          @media only screen and (max-width: 600px) {
            .email-container {
              margin: 40px 20px !important;
            }
            .email-header {
              padding: 0 0 40px 0 !important;
            }
            .email-title {
              font-size: 28px !important;
            }
            .email-greeting {
              font-size: 16px !important;
            }
            .email-body {
              font-size: 15px !important;
            }
            .email-cta {
              padding: 14px 28px !important;
              font-size: 15px !important;
            }
          }
        </style>
      </body>
    </html>
  `;

  const textContent = `
${content.title}

${content.greeting},

${content.body
  .replace(/<[^>]*>/g, "")
  .replace(/\s+/g, " ")
  .trim()}

${content.ctaText && content.ctaUrl ? `${content.ctaText}: ${content.ctaUrl}` : ""}

${content.footer
  .replace(/<[^>]*>/g, "")
  .replace(/\s+/g, " ")
  .trim()}

---
This email was sent by uvala
Visit: {{appUrl}}
  `.trim();

  return {
    subject: content.subject,
    htmlContent: htmlContent.trim(),
    textContent: textContent.trim(),
  };
}

export function getWelcomeEmailTemplate(language: string = "en"): EmailContent {
  const strings = emailStrings[language] || emailStrings.en;
  const content = strings.welcome;

  const bodyContent = `
    <p style="margin-bottom: 32px; font-size: 16px; line-height: 1.6;">
      ${content.intro}
    </p>

    <div style="border: 1px solid #f0f0f0; padding: 32px; border-radius: 8px; margin: 32px 0;">
      <div style="display: flex; align-items: center; margin-bottom: 16px;">
        <span style="font-size: 18px; margin-right: 12px;">→</span>
        <span style="color: #000000; font-size: 16px; font-weight: 500;">${content.readyTitle}</span>
      </div>
      <p style="margin: 0; color: #666666; line-height: 1.5; font-size: 15px;">
        ${content.readyDescription}
      </p>
    </div>
  `;

  return getMinimalistTemplate({
    subject: content.subject,
    title: content.subject,
    greeting: content.greeting,
    body: bodyContent,
    ctaText: content.ctaText,
    ctaUrl: "{{appUrl}}",
    footer: content.footer,
  });
}

export function getSubscriptionEmailTemplate(
  language: string = "en",
): EmailContent {
  const strings = emailStrings[language] || emailStrings.en;
  const content = strings.subscription;

  const featuresIcons = ["•", "•", "•", "•"];
  const featuresHtml = content.features
    .map(
      (feature, index) => `
    <div style="display: flex; align-items: flex-start; margin-bottom: 16px;">
      <span style="color: #000000; font-size: 16px; margin-right: 16px; margin-top: 2px; font-weight: 600;">
        ${featuresIcons[index]}
      </span>
      <span style="color: #333333; font-size: 16px; line-height: 1.5;">${feature}</span>
    </div>
  `,
    )
    .join("");

  const bodyHtml = `
    <p style="margin-bottom: 32px; font-size: 16px; line-height: 1.6;">
      ${content.intro}
    </p>

    <div style="border: 1px solid #f0f0f0; padding: 32px; border-radius: 8px; margin: 32px 0;">
      <div style="display: flex; align-items: center; margin-bottom: 24px;">
        <span style="font-size: 18px; margin-right: 12px;">✓</span>
        <span style="color: #000000; font-size: 16px; font-weight: 500;">${content.includedTitle}</span>
      </div>
      <div style="margin: 0;">
        ${featuresHtml}
      </div>
    </div>

    <p style="color: #666666; font-size: 14px; margin: 32px 0 0; line-height: 1.5;">
      ${content.renewalNote}
    </p>
  `;

  return getMinimalistTemplate({
    subject: content.subject,
    title: content.subject.replace("{{planType}}", "").trim(),
    greeting: content.greeting,
    body: bodyHtml,
    ctaText: content.ctaText,
    ctaUrl: "{{appUrl}}/dashboard",
    footer: content.footer,
  });
}

export function getCancellationEmailTemplate(
  language: string = "en",
): EmailContent {
  const strings = emailStrings[language] || emailStrings.en;
  const content = strings.cancellation;

  const detailsIcons = ["•", "•", "•"];
  const detailsHtml = content.details
    .map(
      (detail, index) => `
    <div style="display: flex; align-items: flex-start; margin-bottom: 16px;">
      <span style="color: #000000; font-size: 16px; margin-right: 16px; margin-top: 2px; font-weight: 600;">
        ${detailsIcons[index]}
      </span>
      <span style="color: #333333; font-size: 16px; line-height: 1.5;">${detail}</span>
    </div>
  `,
    )
    .join("");

  const bodyHtml = `
    <p style="margin-bottom: 32px; font-size: 16px; line-height: 1.6;">
      ${content.intro}
    </p>

    <div style="border: 1px solid #f0f0f0; padding: 32px; border-radius: 8px; margin: 32px 0;">
      <div style="display: flex; align-items: center; margin-bottom: 24px;">
        <span style="font-size: 18px; margin-right: 12px;">ℹ</span>
        <span style="color: #000000; font-size: 16px; font-weight: 500;">${content.whatMeansTitle}</span>
      </div>
      <div style="margin: 0;">
        ${detailsHtml}
      </div>
    </div>

    <div style="border: 1px solid #f0f0f0; padding: 32px; border-radius: 8px; margin: 32px 0;">
      <div style="display: flex; align-items: center; margin-bottom: 16px;">
        <span style="font-size: 18px; margin-right: 12px;">?</span>
        <span style="color: #000000; font-size: 16px; font-weight: 500;">${content.feedbackTitle}</span>
      </div>
      <p style="margin: 0; color: #666666; line-height: 1.5; font-size: 15px;">
        ${content.feedbackDescription}
      </p>
    </div>

    <p style="color: #666666; font-size: 14px; margin: 32px 0 0; line-height: 1.5;">
      ${content.reactivateNote}
    </p>
  `;

  return getMinimalistTemplate({
    subject: content.subject,
    title: content.subject,
    greeting: content.greeting,
    body: bodyHtml,
    ctaText: content.reactivateText,
    ctaUrl: "{{appUrl}}/billing",
    footer: content.footer,
  });
}

export { emailStrings };
