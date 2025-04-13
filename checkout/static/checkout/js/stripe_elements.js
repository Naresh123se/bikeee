/*
    Core logic/payment flow for this comes from here:
    https://stripe.com/docs/payments/accept-a-payment

    CSS from here:
    https://stripe.com/docs/stripe-js
*/
var stripePublicKey = $('#id_stripe_public_key').text().slice(1, -1);
var clientSecret = $('#id_client_secret').text().slice(1, -1);
// create stripe instance with public key
var stripe = Stripe(stripePublicKey);
// create instance of stripe elements
var elements = stripe.elements();
// style stripe elements
// https://stripe.com/docs/js/appendix/style?type=card
var style = {
    base: {
        color: '#000',
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        fontSmoothing: 'antialiased',
        fontSize: '16px',
        '::placeholder': {
            color: '#aab7c4'
        }
    },
    invalid: {
        color: '#dc3545',
        iconColor: '#dc3545'
    }
};
// create card element and mount it to the div with id card-element
// https://stripe.com/docs/js/elements_object/create_element?type=card
var card = elements.create('card', { style: style });
card.mount('#card-element');

// Handle realtime validation errors on the card element
card.addEventListener('change', function (event) {
    var errorDiv = document.getElementById('card-errors');
    if (event.error) {
        var html = `
            <span class="icon" role="alert">
                <i class="fas fa-times"></i>
            </span>
            <span>${event.error.message}</span>
        `;
        $(errorDiv).html(html);
    } else {
        errorDiv.textContent = '';
    }
});

// Handle form submit
var form = document.getElementById('payment-form');

form.addEventListener('submit', function (ev) {
    ev.preventDefault();

    var formIsValid = validateForm(this);
    if (!formIsValid) {
        return;
    }

    // disable card element and submit button to prevent multiple submissions
    card.update({ 'disabled': true });
    $('#submit-button').attr('disabled', true);

    // show loading overlay and fade out payment form
    $('#payment-form').fadeToggle(100);
    $('#loading-overlay').fadeToggle(100);

    // Capture form data that cannot be
    // added to payment intent here in confirmCardPayment method,
    // and send it to cache_checkout_data view as a post request instead
    var saveInfo = $('#id-save-info').is(':checked');
    // From using {% csrf_token %} in the form
    var csrfToken = $('input[name="csrfmiddlewaretoken"]').val();
    var postData = {
        'csrfmiddlewaretoken': csrfToken,
        'client_secret': clientSecret,
        'save_info': saveInfo,
    };
    var url = '/checkout/cache_checkout_data';

    // post data to cache_checkout_data view
    $.post(url, postData).done(function () {
        // confirm card payment with stripe
        stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: card,
                billing_details: {
                    name: $.trim(form.full_name.value),
                    phone: $.trim(form.phone_number.value),
                    email: $.trim(form.email.value),
                    address: {
                        line1: $.trim(form.street_address1.value),
                        line2: $.trim(form.street_address2.value),
                        city: $.trim(form.town_or_city.value),
                        country: $.trim(form.country.value),
                        state: $.trim(form.county.value),
                    }
                }
            },
            shipping: {
                name: $.trim(form.full_name.value),
                phone: $.trim(form.phone_number.value),
                address: {
                    line1: $.trim(form.street_address1.value),
                    line2: $.trim(form.street_address2.value),
                    city: $.trim(form.town_or_city.value),
                    country: $.trim(form.country.value),
                    postal_code: $.trim(form.postcode.value),
                    state: $.trim(form.county.value),
                }
            },
        }).then(function (result) {
            if (result.error) {
                // if error, stop loading overlay and fade in payment form
                // display error message in card element
                // re-enable card element and submit button to allow customer to fix error
                var errorDiv = document.getElementById('card-errors');
                var html = `
                    <span class="icon" role="alert">
                    <i class="fas fa-times"></i>
                    </span>
                    <span>${result.error.message}</span>`;
                $(errorDiv).html(html);
                // show payment form and hide loading overlay
                $('#payment-form').fadeToggle(100);
                $('#loading-overlay').fadeToggle(100);
                // re-enable card element and submit button to allow customer to fix error
                card.update({ 'disabled': false });
                $('#submit-button').attr('disabled', false);
            } else {
                // submit form if payment is successful
                if (result.paymentIntent.status === 'succeeded') {
                    form.submit();
                }
            }
        });
    }).fail(function (xhr, textStatus, error) {
        // if post fails due to view error
        // just reload the page to display the error in django messages
        console.log(xhr.responseText);
        console.error('Failed to cache checkout data.');
        location.reload();
    });
});


// Validate form
function validateForm(form) {
    const emailIsValid = validateEmail(form.email.value);
    if (!emailIsValid) {
        const emailElement = $('#id_email');
        emailElement.addClass('is-invalid');
        $('#email--error').removeClass('d-none');
        emailElement.focus();
        return false;
    }

    const phoneIsValid = validatePhoneNumber(form.phone_number.value);
    if (!phoneIsValid) {
        const phoneElement = $('#id_phone_number');
        phoneElement.addClass('is-invalid');
        $('#phone--error').removeClass('d-none');
        phoneElement.focus();
        return false;
    }

    return true;
}


// Validate email address
// https://www.w3resource.com/javascript/form/email-validation.php
function validateEmail(email) {
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (emailRegex.test(email)) {
        return true;
    } else {
        return false;
    }
}

// https://developerking.medium.com/how-to-integrate-international-phone-number-validation-in-input-field-with-javascript-55d8e4b432c4
// Validate international phone number
function validatePhoneNumber(phoneNumber) {
    // Regular expression for phone number:
    // + is optional
    // minimum 6 digits, maximum 14 digits
    // can contain spaces, hyphens, dots as separators
    var phoneNumberRegex = /^(?:\+)?(?:[0-9][ -.]?){6,14}[0-9]$/;
    // Test the phone number against the regular expression
    if (phoneNumberRegex.test(phoneNumber)) {
      // Phone number is valid
      return true;
    } else {
      // Phone number is not valid
      return false;
    }
  }