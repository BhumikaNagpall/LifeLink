/* =====================================================
   COMPATIBILITY - BLOOD COMPATIBILITY & ZONE DISTANCE
   ===================================================== */

/* =====================================================
   BLOOD COMPATIBILITY
   ===================================================== */

const bloodCompatibility = {

    "O-": [
        "O-",
        "O+",
        "A-",
        "A+",
        "B-",
        "B+",
        "AB-",
        "AB+"
    ],

    "O+": [
        "O+",
        "A+",
        "B+",
        "AB+"
    ],

    "A-": [
        "A-",
        "A+",
        "AB-",
        "AB+"
    ],

    "A+": [
        "A+",
        "AB+"
    ],

    "B-": [
        "B-",
        "B+",
        "AB-",
        "AB+"
    ],

    "B+": [
        "B+",
        "AB+"
    ],

    "AB-": [
        "AB-",
        "AB+"
    ],

    "AB+": [
        "AB+"
    ]

};


function isCompatible(
    donorBlood,
    recipientBlood
) {

    if (
        !donorBlood ||
        !recipientBlood
    ) {

        return false;

    }


    const compatibleRecipients =
        bloodCompatibility[
            donorBlood
        ] || [];


    return compatibleRecipients.includes(
        recipientBlood
    );

}


/* =====================================================
   ZONE DISTANCE
   ===================================================== */

const zoneDistance = {

    "Zone A": {

        "Zone A": 0,
        "Zone B": 1,
        "Zone C": 2,
        "Zone D": 3

    },

    "Zone B": {

        "Zone A": 1,
        "Zone B": 0,
        "Zone C": 1,
        "Zone D": 2

    },

    "Zone C": {

        "Zone A": 2,
        "Zone B": 1,
        "Zone C": 0,
        "Zone D": 1

    },

    "Zone D": {

        "Zone A": 3,
        "Zone B": 2,
        "Zone C": 1,
        "Zone D": 0

    }

};


function getZoneDistance(
    donorZone,
    requestZone
) {

    if (
        zoneDistance[donorZone] &&
        zoneDistance[donorZone][requestZone] !== undefined
    ) {

        return zoneDistance[
            donorZone
        ][requestZone];

    }


    return 99;

}