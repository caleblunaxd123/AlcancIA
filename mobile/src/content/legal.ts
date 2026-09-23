/**
 * Privacy policy and terms shown in the app. The same text must be published at
 * a public URL for the stores (see docs/RELEASE_CHECKLIST.md). Items marked
 * [COMPLETAR] need the owner's legal data before release.
 */

export const LEGAL_CONTACT_EMAIL = 'legadoancestral95@gmail.com';
export const LEGAL_OWNER = '[COMPLETAR: nombre o razón social del titular y RUC]';
export const LEGAL_UPDATED = '23 de septiembre de 2026';

export type LegalSection = { title: string; body: string[] };

export const PRIVACY_POLICY: LegalSection[] = [
  {
    title: 'Quiénes somos',
    body: [
      `AlcancIA es una app de finanzas personales. El responsable del tratamiento de tus datos es ${LEGAL_OWNER}. Puedes escribirnos a ${LEGAL_CONTACT_EMAIL}.`,
      'Tratamos tus datos conforme a la Ley N.º 29733, Ley de Protección de Datos Personales del Perú, y su reglamento.',
    ],
  },
  {
    title: 'Qué datos usamos',
    body: [
      'Cuenta: tu nombre y correo electrónico. Si entras con Google, recibimos tu nombre, correo e identificador de Google; nunca tu contraseña de Google.',
      'Tus finanzas: saldo, ingresos, gastos, metas, deudas, suscripciones y gastos compartidos que tú registras. Los nombres de otras personas en "Compartidos" solo los escribes tú y no se usan para contactarlas.',
      'Datos técnicos mínimos para mantener la sesión segura (fechas de inicio de sesión y dirección IP para limitar abusos).',
      'No usamos tus datos para publicidad, no los vendemos y no accedemos a tus cuentas bancarias.',
    ],
  },
  {
    title: 'Para qué los usamos',
    body: [
      'Para darte el servicio: calcular cuánto puedes gastar, seguir tus metas y respaldar tus datos para que los veas en tus dispositivos.',
      'Para proteger tu cuenta: verificar tu correo con códigos, detectar sesiones robadas y limitar intentos de acceso.',
      'Los cálculos financieros se hacen en tu celular. El asistente con IA recibe solo un resumen ya calculado (montos agregados, metas y próximos pagos), sin tu correo ni tu nombre completo.',
    ],
  },
  {
    title: 'Dónde se guardan y cómo los protegemos',
    body: [
      'En tu celular, cifrados con el almacenamiento seguro del sistema (Keychain o Keystore).',
      'En nuestro servidor, cifrados. Las llaves de cifrado se protegen con una llave maestra guardada aparte de la base de datos. Las contraseñas se guardan solo como huella irreversible (PBKDF2).',
      'Toda comunicación con el servidor viaja por HTTPS.',
    ],
  },
  {
    title: 'Con quién los compartimos',
    body: [
      'Solo con proveedores que necesitamos para funcionar y bajo confidencialidad: el servicio de hosting y base de datos, el servicio de envío de correos (para los códigos) y Google (si eliges entrar con Google). Si se activa el asistente con un proveedor de IA externo, solo recibe el resumen descrito arriba.',
      'Algunos de estos proveedores pueden estar fuera del Perú (flujo transfronterizo). Solo trabajamos con proveedores que ofrecen niveles de protección adecuados.',
    ],
  },
  {
    title: 'Cuánto tiempo los guardamos',
    body: [
      'Mientras tengas tu cuenta. Si la eliminas, borramos de inmediato tu cuenta, tus sesiones y tus datos financieros del servidor. Las copias de seguridad técnicas se sobrescriben en un plazo máximo de 30 días.',
    ],
  },
  {
    title: 'Tus derechos',
    body: [
      'Puedes ejercer tus derechos de acceso, rectificación, cancelación y oposición (ARCO):',
      '• Acceso: en Mi cuenta → Privacidad y datos → "Descargar mis datos".',
      '• Rectificación: edita tus datos en la app o tu nombre en Mi perfil.',
      '• Cancelación: en Mi cuenta → Privacidad y datos → "Eliminar mi cuenta".',
      `• Para cualquier otra solicitud escríbenos a ${LEGAL_CONTACT_EMAIL}. Respondemos en los plazos de ley. También puedes acudir a la Autoridad Nacional de Protección de Datos Personales.`,
    ],
  },
  {
    title: 'Menores de edad',
    body: ['AlcancIA está dirigida a mayores de 18 años. No recopilamos a sabiendas datos de menores.'],
  },
  {
    title: 'Cambios a esta política',
    body: [`Si cambiamos algo importante te avisaremos en la app antes de que aplique. Última actualización: ${LEGAL_UPDATED}.`],
  },
];

export const TERMS: LegalSection[] = [
  {
    title: 'El servicio',
    body: [
      'AlcancIA te ayuda a organizar tu dinero: registrar movimientos, planificar metas y estimar cuánto puedes gastar. Al crear una cuenta aceptas estos términos.',
    ],
  },
  {
    title: 'No es asesoría financiera',
    body: [
      'La información y las sugerencias de AlcancIA, incluidas las del asistente, son orientativas y se basan en los datos que tú registras. No constituyen asesoría financiera, legal ni tributaria. Las decisiones sobre tu dinero son tuyas.',
      'Los cálculos dependen de que tus datos estén completos y actualizados.',
    ],
  },
  {
    title: 'Tu cuenta',
    body: [
      'Eres responsable de mantener segura tu contraseña y el acceso a tu correo. Avísanos si sospechas un uso no autorizado.',
      'Puedes eliminar tu cuenta en cualquier momento desde la app.',
    ],
  },
  {
    title: 'Uso aceptable',
    body: [
      'No uses AlcancIA para actividades ilegales, para intentar acceder a cuentas ajenas ni para interferir con el servicio.',
    ],
  },
  {
    title: 'Disponibilidad',
    body: [
      'Trabajamos para que AlcancIA esté disponible y tus datos respaldados, pero el servicio puede tener interrupciones. La app sigue funcionando sin conexión y sincroniza al volver.',
    ],
  },
  {
    title: 'Responsabilidad',
    body: [
      'En la medida permitida por la ley, no respondemos por decisiones tomadas en base a la información de la app ni por pérdidas derivadas de datos incorrectos ingresados por el usuario.',
    ],
  },
  {
    title: 'Ley aplicable',
    body: [
      `Estos términos se rigen por las leyes de la República del Perú. Consultas: ${LEGAL_CONTACT_EMAIL}. Última actualización: ${LEGAL_UPDATED}.`,
    ],
  },
];
