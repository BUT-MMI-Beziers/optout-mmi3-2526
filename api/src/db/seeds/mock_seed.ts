import { users, userContacts, brokers, emailTemplates, removalRequests, notifications } from '../schema.js';

/**
 * Injecte des données fictives réalistes dans la base de données à des fins de développement et de test.
 * Cela met en place un environnement de test de base (Utilisateur + Demande) pour valider 
 * le service de rendu de template sans nécessiter de saisie de données manuelle.
 * * @param db L'instance de connexion à la base de données passée par le script de migration.
 */
export async function seedMockData(db: any) {
  console.log("Initialisation de l'environnement de développement avec des données fictives...");

  try {
    // 1. Vérification : On s'assure que la table users est vide pour éviter les doublons lors du seed
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) {
      console.log("Seed ignoré : la base de données contient déjà des données utilisateurs.");
      return;
    }

    // 2. Création d'un utilisateur fictif avec des données réalistes
    const [mockUser] = await db.insert(users).values({
      email: "alice.lemaire@example.com",
      // Format standard d'un hash bcrypt pour simuler un mot de passe sécurisé
      passwordHash: "$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjIQ6K.T.W",
      firstName: "Alice",
      lastName: "Lemaire",
      role: "user"
    }).returning();

    // 3. Ajout d'une adresse physique (requise pour l'interpolation des templates d'emails)
    await db.insert(userContacts).values({
      userId: mockUser.id,
      type: "address",
      value: "45 Avenue de la République, 75011 Paris",
      isPrimary: true
    });

    // 4. Récupération des prérequis insérés par les seeds précédents (brokers et templates)
    const [firstBroker] = await db.select().from(brokers).limit(1);
    const [firstTemplate] = await db.select().from(emailTemplates).limit(1);

    if (!firstBroker || !firstTemplate) {
      console.warn("Avertissement : Dépendances manquantes (brokers ou templates). Création de la demande annulée.");
      return;
    }

    // 5. Génération de l'entité finale de demande de suppression (removal request)
    await db.insert(removalRequests).values({
      userId: mockUser.id,
      brokerId: firstBroker.id,
      templateId: firstTemplate.id,
      emailBody: "Ceci est un texte temporaire généré par le mock."
    });

        // 6. Récupération de la demande créée pour la référencer dans les notifications
    const [mockRequest] = await db.select().from(removalRequests).limit(1);

    // 7. Insertion de notifications fictives pour tester les endpoints F18
    await db.insert(notifications).values([
      {
        userId: mockUser.id,
        requestId: mockRequest.id,
        message: `Votre demande auprès de ${firstBroker.name} n'a pas reçu de réponse depuis 30 jours. Une relance automatique a été envoyée.`,
        isRead: false,
      },
      {
        userId: mockUser.id,
        requestId: mockRequest.id,
        message: `Votre demande auprès de ${firstBroker.name} a été complétée avec succès.`,
        isRead: true,
      },
    ]);


    console.log("Insertion des données fictives terminée avec succès.");

  } catch (error) {
    console.error("Erreur lors de l'insertion des données fictives :", error);
  }
}