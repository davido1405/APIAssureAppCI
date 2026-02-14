class utils {
  //convertir dégré en radiant
  static degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  //Calculer distances entre deux points GPS
  static distance(
    latitudeUtilisateur,
    longitudeUtilisateur,
    latitudePharmacie,
    longitudePharmacie,
  ) {
    const rayonTerre = 6371000;
    const diffLatitude = latitudePharmacie - latitudeUtilisateur;
    const diffLongitude = longitudePharmacie - longitudeUtilisateur;

    const facteur1 =
      Math.sin(diffLatitude / 2) * Math.sin(diffLatitude / 2) +
      Math.cos(latitudeUtilisateur) *
        Math.cos(latitudePharmacie) *
        Math.sin(diffLongitude / 2) *
        Math.sin(diffLongitude / 2);

    const facteur2 =
      2 * Math.atan2(Math.sqrt(facteur1), Math.sqrt(1 - facteur1));

    return rayonTerre * facteur2;
  }
}

module.exports = utils;
